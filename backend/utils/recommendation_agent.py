import json
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, Field
import re
import uuid
from datetime import datetime
from dynamo.fetch import fetch_all_items

load_dotenv()

# Initialize Ollama client for Llama 3.2
client = OpenAI(
    base_url="http://localhost:11434/v1", 
    api_key="ollama"
)

# ==================== Pydantic Models for Structured Output ====================

class PriorityAction(BaseModel):
    """Model for a priority action recommendation"""
    action: str = Field(..., description="Description of the action to take")
    rationale: str = Field(..., description="Why this action is important")
    timeline: str = Field(..., description="When to implement this action")

class RecommendedEvent(BaseModel):
    """Model for a recommended event or program"""
    event: str = Field(..., description="Name of the event or program")
    description: str = Field(..., description="Details about the event")
    expected_impact: str = Field(..., description="What this will improve")

class LongTermStrategy(BaseModel):
    """Model for a long-term strategy"""
    strategy: str = Field(..., description="Description of the strategy")
    implementation: Optional[str] = Field(None, description="How to implement this strategy")

class RecommendationOutput(BaseModel):
    """Model for the complete recommendation output from AI"""
    priority_actions: List[PriorityAction] = Field(
        default_factory=list,
        description="Top 3 priority actions to address critical issues"
    )
    recommended_events: List[RecommendedEvent] = Field(
        default_factory=list,
        description="Recommended team-building activities, workshops, or initiatives"
    )
    long_term_strategies: List[LongTermStrategy] = Field(
        default_factory=list,
        description="Sustainable changes to improve department culture"
    )
    metrics_to_track: List[str] = Field(
        default_factory=list,
        description="KPIs to monitor improvement"
    )

class MicroAction(BaseModel):
    """Model for a micro-action request"""
    id: Optional[str] = Field(default=None, description="UUID of the action")
    title: str = Field(..., description="Title of the micro-action")
    description: str = Field(..., description="Description of the micro-action")
    category: str = Field(..., description="Category: workload | recognition | communication | leadership | wellbeing")
    targetIssue: str = Field(..., description="The specific issue this action addresses")
    priority: str = Field(..., description="Priority: high | medium | low")
    estimatedImpact: str = Field(..., description="Estimated impact description")
    targetPositions: List[str] = Field(default_factory=list, description="List of target positions")
    createdAt: Optional[str] = Field(default=None, description="ISO 8601 datetime")
    reason: str = Field(..., description="Reason why require recommendation actions")

class MicroActionsOutput(BaseModel):
    """Model for list of micro actions"""
    micro_actions: List[MicroAction] = Field(default_factory=list)



# ==================== Database Retrieval Functions ====================



def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(i) for i in o]
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return float(o)
    return o



def get_enriched_context_for_recommendations(
    department: str,
    position: Optional[str] = None,
    quarter: Optional[str] = None,
    year: Optional[int] = None
) -> Dict:
    """
    Get enriched context including employee and workload data for better recommendations.
    
    Parameters:
    -----------
    department : str
        Department name
    quarter : str, optional
        Quarter filter
    year : int, optional
        Year filter
    
    Returns:
    --------
    Dict
        Enriched context with employee, workload, and survey data
    """
    # Get risk summary
    risk_summary = get_risk_summary(department, position, quarter, year)
    
    # Get employee data for the department
    employee_df = fetch_all_items("Employees")
    dept_employees = employee_df[employee_df['department'] == department.lower()]

    # Filter employees by position if provided
    if position and not dept_employees.empty:
        dept_employees = dept_employees[dept_employees['position'].str.lower() == position.lower()]
    
    # Get workload data
    workload_df = fetch_all_items("Employee_Workload")

    
    # Merge to get department workload
    if not workload_df.empty and not dept_employees.empty:
        dept_workload = workload_df.merge(
            dept_employees[['employee_id', 'department']], 
            on='employee_id', 
            how='inner'
        )
        avg_workload = dept_workload['work_load'].mean() if not dept_workload.empty else None
    else:
        avg_workload = None
    
    # Enrich context
    context = {
        "total_employees": len(dept_employees),
        "avg_workload": float(avg_workload) if avg_workload is not None else None,
    }
    
    return context


# ==================== AI Recommendation Engine ====================

def clean_llm_json(raw_text: str):
    """
    Cleans and fixes invalid JSON responses produced by LLMs.
    Returns a Python dictionary.
    """
    # 1. Strip Markdown Code Blocks (Start and End)
    # Matches ```json, ```, or just ``` at the start, and ``` at the end
    if "```" in raw_text:
        raw_text = re.sub(r"^```[a-zA-Z]*\s*", "", raw_text.strip())
        raw_text = re.sub(r"\s*```$", "", raw_text.strip())

    # 2. Extract strictly from first '{' to last '}'
    # This ignores any conversational filler text before or after the JSON
    start_idx = raw_text.find('{')
    end_idx = raw_text.rfind('}')
    
    if start_idx != -1 and end_idx != -1:
        raw_text = raw_text[start_idx : end_idx + 1]

    # 3. Remove invalid Unicode control characters
    raw_text = re.sub(r"[\x00-\x1F\x7F]", "", raw_text)

    # 4. Replace smart quotes with normal quotes
    raw_text = raw_text.replace("“", '"').replace("”", '"')
    raw_text = raw_text.replace("‘", "'").replace("’", "'")

    # 5. Fix common LLM mistake: missing closing quotes before newline
    # Example: "description": "some text
    raw_text = re.sub(r'\"([^"]*?)\n', r'"\1",\n', raw_text)

    # 6. Remove trailing commas before } or ]
    raw_text = re.sub(r',\s*([}\]])', r'\1', raw_text)

    # 7. Escape unescaped quotes inside values
    # This is complex, so we try parsing first.
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        pass  # Continue to repair

    # 8. Attempt manual repairs for specific known issues
    
    # Fix: "key": "value"text" -> "key": "value\"text"
    # This regex looks for quotes inside what appears to be a string value
    # It's risky but helps with Llama outputs
    try:
        # Regex to find unescaped quotes inside value positions could be very complex.
        # Instead, let's try a simpler fallback for the specific error "Leadership Feedback,
        # Fix missing closing quote on keys or values if they were cut off
        pass
    except Exception:
        pass

    # Final attempt to parse
    try:
        return json.loads(raw_text)
    except Exception as e:
        # Print the cleaned text for debugging
        print(f"Failed JSON Parse. Text:\n{raw_text}")
        raise ValueError(f"Failed to clean/parse JSON: {e}")



def generate_micro_actions_with_llama(
    department: Optional[str] = None,
    position: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 10
) -> Dict:
    """
    Generate micro-actions using Llama 3.2.
    """
    # 1. Fetch Context (reuses existing logic)
    # If department is provided, get specific risk context; otherwise get general
    if department:
        context = get_enriched_context_for_recommendations(department, position)
        dept_context_str = f"Specific to Department: {department}"
        if position:
            dept_context_str += f", Position: {position}"
    else:
        # If no department, we could fetch global stats or just generic best practices
        # For now, let's try to fetch global stats if possible, or just pass empty context
        # Ideally we'd aggregate all departments, but let's stick to "General" if not specified
        context = {} 
        dept_context_str = "General Organization-wide Recommendations"

    # Context string construction
    context_details = ""
    if "error" not in context and context:
        context_details = f"""
        **Context Data:**
        - Burnout Risk: {context.get('burnout_risk_percentage', 'N/A')}%
        - Turnover Risk: {context.get('turnover_risk_percentage', 'N/A')}%
        - Bad Sentiment Count: {context.get('bad_sentiment_count', 'N/A')}
        - Sentiment Distribution: {context.get('sentiment_distribution', 'N/A')}
        - Top Issues: {', '.join(context.get('common_bad_categories', []))}
        - Recurring Themes: {json.dumps(context.get('top_themes', {}), indent=2)}
        """

    # 2. Build Prompt
    prompt = f"""You are an expert HR AI assistant. Generate a list of "Micro Actions" to improve employee wellbeing and performance.
    
    **Target Request:**
    - {dept_context_str}
    - Position Focus: {position if position else "Any"}
    - Priority Filter: {priority if priority else "Any"}
    - Category Filter: {category if category else "workload, recognition, communication, leadership, wellbeing"}
    - Limit: {limit} actions

    {context_details}

    **Guidelines:**
    - Micro actions are small, bite-sized tasks that managers or leads can do quickly.
    - Categories MUST be one of: workload, recognition, communication, leadership, wellbeing.
    - Priorities MUST be one of: high, medium, low.
    - Target specific issues identified in the context if available.
    - If specific filters (priority/category) are requested, strictly follow them.

    **Response Format:**
    Provide a JSON object with a single key "micro_actions" containing a list of objects.
    Each object must have:
    - title: Short title
    - description: Actionable description
    - category: (workload | recognition | communication | leadership | wellbeing)
    - targetIssue: What problem does this solve?
    - priority: (high | medium | low)
    - estimatedImpact: Qualitative impact (e.g. "Improves morale")
    - target department: List of department names (e.g. ["{department if department else 'All Teams'}"])
    - reason: Why is this recommended?

    Example:
    {{
        "micro_actions": [
            {{
                "title": "Quick Check-in",
                "description": "Spend 5 minutes asking how the team is feeling.",
                "category": "communication",
                "targetIssue": "Isolation",
                "priority": "high",
                "estimatedImpact": "High engagement boost",
                "targetPositions": ["All"],
                "reason": "Regular contact reduces isolation."
            }}
        ]
    }}
    
    Output ONLY valid JSON.
    """
    print(prompt)
    try:
        response = client.chat.completions.create(
            model="llama3.2",
            messages=[
                {"role": "system", "content": "You are a helpful HR AI assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        recommendation_text = response.choices[0].message.content.strip()
        
        # Clean JSON
        cleaned_json = clean_llm_json(recommendation_text)
        
        # Parse and Validate
        output = MicroActionsOutput(**cleaned_json)
        
        # Post-processing: Add IDs and Dates
        actions_list = []
        for action in output.micro_actions:
            # Filter logic (double check LLM output)
            if priority and action.priority.lower() != priority.lower():
                continue
            if category and action.category.lower() != category.lower():
                continue
                
            # Add metadata
            action.id = str(uuid.uuid4())
            action.createdAt = datetime.now().isoformat()
            
            # Ensure targetPositions has defaults if empty
            if not action.targetPositions and department:
                action.targetPositions = [department]
            elif not action.targetPositions:
                 action.targetPositions = ["All Positions"]

            actions_list.append(action.model_dump())
            
            if len(actions_list) >= limit:
                break
                
        return {"success": True, "data": actions_list}

    except Exception as e:
        print(f"Error generating micro actions: {e}")
        return {
            "success": False, 
            "error": str(e),
            "data": [] # Return empty list on failure to avoid breaking frontend
        }




