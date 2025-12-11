from fastapi import APIRouter, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
import uuid
import pandas as pd
from typing import Optional, List
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
# Connection imports
from utils.nlp_engine import process_single_comment
from dynamo.connection import dynamo
from dynamo.fetch import fetch_all_items

router = APIRouter(
    prefix="/feedback",
    tags=["Feedback"]
)

# --- Pydantic Models ---

class FeedbackSubmission(BaseModel):
    employee_id: str = Field(..., description="ID of the employee")
    comments: str = Field(..., description="The feedback content")
    submission_date: str = Field(..., description="YYYY-MM-DD")

class FeedbackSampleItem(BaseModel):
    id: str
    text: str
    sentiment: str
    theme: str
    detectedAt: str
    department: str
    position: str

class FeedbackSampleResponse(BaseModel):
    success: bool = True
    data: List[FeedbackSampleItem]


# --- Routes ---

@router.post("/")
async def submit_feedback(feedback: FeedbackSubmission):
    try:
        # 1. Process NLP
        analysis_result = await run_in_threadpool(process_single_comment, feedback.comments)
        
        # 2. Prepare Item (Using EXACT Schema provided)
        feedback_id = str(uuid.uuid4())
        
        item = {
            "comment_id": {"S": feedback_id},
            "employee_id": {"S": feedback.employee_id},
            "submission_date": {"S": feedback.submission_date},
            "comments": {"S": feedback.comments},
            "rephrased_comments": {"S": analysis_result.get("rephrased", "")},
            "category": {"S": analysis_result.get("categories", "")},
            "sentiment_score": {"N": str(analysis_result.get("sentiment_score", 5))},
            "sentiment_label": {"S": analysis_result.get("sentiment_label", "neutral")}
        }
        
        # 3. Save
        dynamo.put_item(TableName="Feedbacks", Item=item)
        
        return {"status": "success", "data": {"id": feedback_id}}
        
    except Exception as e:
        print(f"Error submitting: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/samples", response_model=FeedbackSampleResponse)
@cache(expire=3600)
def get_feedback_samples(
    dateRange: str = Query(..., description="week | month | quarter | year | all"),
    sentiment: Optional[str] = Query(None),
    theme: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    limit: int = Query(20)
):
    try:
        # 1. Fetch Feedbacks
        raw_feedback = fetch_all_items("Feedbacks")
        df = pd.DataFrame(raw_feedback)

        # DEBUG: Check if data exists at all
        print(f"DEBUG: Total Feedbacks fetched: {len(df)}")
        if not df.empty:
            print(f"DEBUG: Feedback Columns found: {df.columns.tolist()}")

        if df.empty:
            return {"success": True, "data": []}

        # 2. Fetch Employees & Merge
        try:
            employees_raw = fetch_all_items("Employees")
            emp_df = pd.DataFrame(employees_raw)
            print(f"DEBUG: Total Employees fetched: {len(emp_df)}")

            if not emp_df.empty:
                # 2a. Normalize Keys (Strip whitespace and force string)
                df['employee_id'] = df['employee_id'].astype(str).str.strip()
                emp_df['Employee_ID'] = emp_df['Employee_ID'].astype(str).str.strip()

                # 2b. Merge (Left Join)
                # Map 'division' from employees to 'department'
                df = df.merge(
                    emp_df[['Employee_ID', 'division', 'position']], 
                    left_on='employee_id', 
                    right_on='Employee_ID', 
                    how='left'
                )
        except Exception as e:
            print(f"DEBUG: Merge failed: {e}")

        # 3. Handle Columns & Missing Data
        # Rename 'division' to 'department' if it exists, otherwise create placeholder
        if 'division' in df.columns:
            df['department'] = df['division']
        else:
            df['department'] = "Unknown"

        # Ensure other columns exist
        if 'position' not in df.columns: df['position'] = "Unknown"
        
        df['department'] = df['department'].fillna("Unknown")
        df['position'] = df['position'].fillna("Unknown")

        # 4. Date Parsing
        df['submission_date'] = pd.to_datetime(df['submission_date'], errors='coerce')
        df = df.dropna(subset=['submission_date'])

        # 5. Filter Logic
        today = datetime.now()
        
        # Calculate Start Date
        if dateRange.lower() == 'week':
            start_date = today - timedelta(days=7)
        elif dateRange.lower() == 'month':
            start_date = today - timedelta(days=30)
        elif dateRange.lower() == 'quarter':
            start_date = today - timedelta(days=90)
        elif dateRange.lower() == 'year':
            start_date = today - timedelta(days=365)
        else:
            # If 'all' or unknown, set a very old date
            start_date = today - timedelta(days=365*10)

        print(f"DEBUG: Filtering data from {start_date} to {today}")

        # Apply Filters
        mask = (df['submission_date'] >= start_date)

        if sentiment:
            mask &= (df['sentiment_label'].astype(str).str.lower() == sentiment.lower())
        
        if theme:
            # DB Column is 'category'
            mask &= (df['category'].astype(str).str.lower() == theme.lower())

        if department:
            # Using the merged/mapped column
            mask &= (df['department'].astype(str).str.lower() == department.lower())

        df_filtered = df[mask].copy()
        
        print(f"DEBUG: Count after filtering: {len(df_filtered)}")

        # 6. Formatting Response
        # Sort recent first
        df_filtered = df_filtered.sort_values(by='submission_date', ascending=False)
        df_filtered = df_filtered.head(limit)

        response_data = []
        for _, row in df_filtered.iterrows():
            
            # TEXT SELECTION: Try rephrased first, then original
            # Note: You said the column is 'rephrased_comments' (plural)
            text_content = row.get('rephrased_comments')
            
            # If rephrased is missing/NaN/Empty, use original 'comments'
            if pd.isna(text_content) or not text_content:
                text_content = row.get('comments', "No content")

            # ID SELECTION
            obj_id = row.get('comment_id', str(uuid.uuid4()))

            item = {
                "id": str(obj_id),
                "text": str(text_content),
                "sentiment": str(row.get('sentiment_label', 'neutral')),
                "theme": str(row.get('category', 'Uncategorized')),
                "detectedAt": row['submission_date'].isoformat(),
                "department": str(row.get('department', 'Unknown')),
                "position": str(row.get('position', 'Unknown'))
            }
            response_data.append(item)

        return {
            "success": True,
            "data": response_data
        }

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class SummaryStatsResponse(BaseModel):
    success: bool = True
    data: dict


@router.get("/summary", response_model=SummaryStatsResponse)
@cache(expire=3600)
def get_summary(
    dateRange: str = Query(..., description="week | month | quarter | year | all"),
):
    try:
        # 1. Fetch Data
        # Note: Using "Feedbacks" (Plural) based on your previous endpoints
        raw_data = fetch_all_items("Feedbacks") 
        df = pd.DataFrame(raw_data)
        print(df.columns)

        if df.empty:
            return {"success": True, "data": {
                "totalMentions": 0,
                "positiveThemes": 0,
                "negativeThemes": 0,
                "detectedThemes": 0,
                "neutralThemes": 0
            }}

        # 2. Date Parsing & Filtering
        # Convert string dates to datetime objects
        df['submission_date'] = pd.to_datetime(df['submission_date'], errors='coerce')
        df = df.dropna(subset=['submission_date'])

        # Calculate Start Date
        today = datetime.now()
        start_date = today - timedelta(days=365*10) # Default 'all'

        if dateRange.lower() == 'week':
            start_date = today - timedelta(days=7)
        elif dateRange.lower() == 'month':
            start_date = today - timedelta(days=30)
        elif dateRange.lower() == 'quarter':
            start_date = today - timedelta(days=90)
        elif dateRange.lower() == 'year':
            start_date = today - timedelta(days=365)
        
        # Apply Filter
        df_filtered = df[df['submission_date'] >= start_date].copy()

        # 3. Calculate Metrics
        
        # A. Total Mentions (Volume of feedback in this period)
        total_mentions = len(df_filtered)

        if total_mentions == 0:
             return {"success": True, "data": {
                "totalMentions": 0,
                "positiveThemes": 0,
                "negativeThemes": 0,
                "detectedThemes": 0,
                "neutralThemes": 0
            }}

        # Normalize sentiment label to handle "Positive", "positive", "POSITIVE" etc.
        # Ensure column exists and is string
        if 'sentiment_label' not in df_filtered.columns:
            df_filtered['sentiment_label'] = 'neutral'
            
        df_filtered['sentiment_label'] = df_filtered['sentiment_label'].astype(str).str.lower()

        # B. Positive/Negative Counts (Count of feedbacks, not categories)
        positive_count = len(df_filtered[df_filtered['sentiment_label'] == 'positive'])
        negative_count = len(df_filtered[df_filtered['sentiment_label'].isin(['negative', 'critical'])])
        neutral_count = total_mentions - (positive_count + negative_count)

        # C. Detected Themes (Count of UNIQUE categories identified)
        # e.g., if 5 people talk about "Salary", that is 1 detected theme.
        if 'category' in df_filtered.columns:
            detected_themes = df_filtered['category'].nunique()
        else:
            detected_themes = 0

        return {
            "success": True, 
            "data": {
                "totalMentions": int(total_mentions),
                "positiveThemes": int(positive_count),
                "negativeThemes": int(negative_count),
                "neutralThemes": int(neutral_count),
                "detectedThemes": int(detected_themes) 
            }
        }

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        # import traceback
        # traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/cache")
async def clear_cache():
    """
    Clear ALL cached data.
    With in-memory cache, we usually just clear everything as it's cheap to rebuild.
    """
    await FastAPICache.clear()
    return {"success": True, "message": "All cache cleared"}