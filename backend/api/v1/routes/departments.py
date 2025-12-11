from fastapi import APIRouter, HTTPException
import boto3
from boto3.dynamodb.conditions import Key, Attr
import os
import requests
import json
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any
from dotenv import load_dotenv
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache

load_dotenv()

router = APIRouter(
    prefix="/departments",
    tags=["Departments"]
)

# Initialize boto3 resources
dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION'))
table_departments = dynamodb.Table('Departments')
table_employees = dynamodb.Table('Employees')
table_feedbacks = dynamodb.Table('Feedbacks')

# Configuration for Ollama
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2"

def calculate_risk_label(value: float, metric_type: str = 'score') -> str:
    """
    Returns: healthy | watch | warning | critical
    """
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return "healthy"

    if metric_type == 'score': 
        # Engagement (Higher is better) -> Thresholds: 75, 65, 55
        if value > 75: return 'healthy'
        if value > 65: return 'watch'
        if value >= 55: return 'warning'
        return 'critical'
    else: 
        # Burnout/Attrition/Stress (Lower is better) -> Thresholds: 20, 35, 50
        if value <= 20: return 'healthy'
        if value <= 35: return 'watch'
        if value <= 50: return 'warning'
        return 'critical'

def generate_llm_insight(dept_name: str, metrics: Dict, feedbacks: List[str]) -> Dict[str, str]:
    """
    Calls local Ollama instance to generate Diagnosis and Recommendation.
    """
    feedback_text = "\n- ".join(feedbacks[:10]) if feedbacks else "No recent qualitative feedback available."
    
    prompt = f"""
    Act as an expert HR Analyst. Analyze the following department data:
    
    Department: {dept_name}
    Metrics:
    - Engagement Rate: {metrics.get('engagement_rate', 0)}%
    - Attrition Rate: {metrics.get('attrition_rate', 0)}%
    - Stress Rate: {metrics.get('stress_rate', 0)}%
    - Leadership Score (1-5): {metrics.get('Dim_Leadership', 0)}
    - Enablement Score (1-5): {metrics.get('Dim_Enablement', 0)}
    
    Recent Employee Feedback:
    - {feedback_text}
    
    Task:
    1. Provide a "diagnosis" of the current situation.
    2. Provide a "recommendation" for improvement.
    
    Constraints:
    - Output must be strict JSON with keys: "diagnosis", "recommendation".
    - Total length must be under 100 tokens.
    - Be professional and concise.
    """

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "format": "json", # Forces JSON output from Llama 3.2
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=30)
        if response.status_code == 200:
            result = response.json()
            return json.loads(result['response'])
        else:
            return {"diagnosis": "Error generating insight", "recommendation": "Check LLM service."}
    except Exception as e:
        print(f"LLM Error: {str(e)}")
        return {"diagnosis": "LLM currently unavailable.", "recommendation": "Please rely on metrics."}

@router.get('/')
@cache(expire=3600)
def get_departments_dashboard():
    try:
        # 1. Fetch all Departments
        dept_response = table_departments.scan()
        departments = dept_response.get('Items', [])

        # 2. Fetch all Employees (To count members per division)
        # Note: In production with large data, use GSI or specific queries instead of Scan
        emp_response = table_employees.scan()
        employees = emp_response.get('Items', [])
        
        # 3. Fetch all Feedbacks
        feed_response = table_feedbacks.scan()
        feedbacks = feed_response.get('Items', [])

        # --- Data Pre-processing ---

        # Map Division -> List of Employee IDs
        dept_employee_map = {}
        for emp in employees:
            division = emp.get('division')  # Assuming 'division' matches 'department_name'
            emp_id = emp.get('Employee_ID')
            if division not in dept_employee_map:
                dept_employee_map[division] = []
            dept_employee_map[division].append(emp_id)

        # Map Employee ID -> Latest Feedback
        # We need the LATEST feedback per employee
        emp_feedback_map = {}
        
        # Sort feedbacks by date (assuming ISO format string)
        sorted_feedbacks = sorted(feedbacks, key=lambda x: x.get('submission_date', ''), reverse=True)
        
        for fb in sorted_feedbacks:
            e_id = fb.get('employee_id')
            # Since we sorted by date desc, the first time we see an employee ID, it is their latest
            if e_id not in emp_feedback_map:
                emp_feedback_map[e_id] = fb

        # --- Construct Response ---
        final_results = []

        for dept in departments:
            d_name = dept.get('department_name')
            
            # Get Employees for this department
            # (Matches department_name to Employee 'division')
            member_ids = dept_employee_map.get(d_name, [])
            total_members = len(member_ids)
            
            # Get Feedbacks for these specific members
            dept_feedbacks = []
            dept_feedback_texts = []
            
            for m_id in member_ids:
                if m_id in emp_feedback_map:
                    fb_obj = emp_feedback_map[m_id]
                    # Using 'rephrased_comments' if available, else 'comments'
                    comment = fb_obj.get('rephrased_comments') or fb_obj.get('comments')
                    if comment:
                        dept_feedbacks.append(fb_obj)
                        dept_feedback_texts.append(comment)

            # Apply Risk Labels
            # Note: We convert Decimal to float for JSON serialization
            engagement = float(dept.get('engagement_rate', 0))
            attrition = float(dept.get('attrition_rate', 0))
            stress = float(dept.get('stress_rate', 0))

            processed_dept = {
                # Original Data Columns
                **{k: (float(v) if isinstance(v, (int, float,  __import__('decimal').Decimal)) else v) for k,v in dept.items()},
                
                # New Computed Fields
                "total_members": total_members,
                "risk_labels": {
                    "engagement_risk": calculate_risk_label(engagement, 'score'),
                    "attrition_risk": calculate_risk_label(attrition, 'inverse'), # Lower is better
                    "stress_risk": calculate_risk_label(stress, 'inverse')        # Lower is better
                }
            }

            # Generate LLM Diagnosis
            # We only generate if we have data to analyze
            ai_result = generate_llm_insight(d_name, processed_dept, dept_feedback_texts)
            
            processed_dept['ai_analysis'] = ai_result

            final_results.append(processed_dept)

        return final_results

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cache")
async def clear_cache():
    """
    Clear ALL cached data.
    With in-memory cache, we usually just clear everything as it's cheap to rebuild.
    """
    await FastAPICache.clear()
    return {"success": True, "message": "All cache cleared"}