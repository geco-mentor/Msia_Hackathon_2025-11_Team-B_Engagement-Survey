import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dynamo.fetch import fetch_all_items
from fastapi import APIRouter
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
router = APIRouter(
    prefix="/trends",
    tags=["Trends"]
)

@router.get("/engagement")
@cache(expire=3600)
def get_engagement_trends(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    position: Optional[str] = None,
    department: Optional[str] = None,
    granularity: str = 'weekly'
) -> Dict[str, Any]:
    """
    API Logic for GET /trends/engagement
    Aggregates engagement, burnout, and attrition scores over a time period.
    """

    # 0. Set Defaults if missing
    if not end_date:
        end_date = datetime.now().strftime('%Y-%m-%d')
    if not start_date:
        # Default to 90 days prior to end_date
        start_date = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')

    # 1. Fetch Data
    survey_data = fetch_all_items("Survey_Response")
    employee_data = fetch_all_items("Employees")
    
    df_survey = pd.DataFrame(survey_data)
    df_emp = pd.DataFrame(employee_data)

    if df_survey.empty:
        return {"success": True, "data": []}

    # 2. Pre-processing & Merging
    # Ensure ID columns are strings
    df_survey['employee_id'] = df_survey['employee_id'].astype(str)
    
    # Convert submission_date to datetime objects immediately for filtering
    if 'submission_date' in df_survey.columns:
        df_survey['submission_date'] = pd.to_datetime(df_survey['submission_date'])
    else:
        # Fallback if column name differs (e.g., lowercase vs snake_case)
        return {"success": False, "error": "submission_date column missing"}

    # Filter by Date Range (inclusive)
    # We filter BEFORE merging to optimize performance
    try:
        s_date = pd.to_datetime(start_date)
        e_date = pd.to_datetime(end_date)
        
        # Filter logic: date >= start_date AND date <= end_date
        mask = (df_survey['submission_date'] >= s_date) & (df_survey['submission_date'] <= e_date)
        df_survey = df_survey.loc[mask]
    except Exception as e:
        return {"success": False, "error": f"Invalid date format: {e}"}

    if df_survey.empty:
        return {"success": True, "data": []}

    # Merge with Employees for Position/Dept filtering
    if not df_emp.empty:
        df_emp['Employee_ID'] = df_emp['Employee_ID'].astype(str)
        
        # Inner join to ensure we only count valid employees
        df_merged = pd.merge(
            df_survey,
            df_emp,
            left_on='employee_id',
            right_on='Employee_ID',
            how='inner',
            suffixes=('', '_emp')
        )
        
        # Map source of truth columns
        df_merged['filter_position'] = df_merged['position'] # use employee table position
        df_merged['filter_department'] = df_merged['division']   # use employee table division
    else:
        # Fallback if Employee table is empty (use survey data directly)
        df_merged = df_survey
        df_merged['filter_position'] = df_merged.get('position', 'Unknown')
        df_merged['filter_department'] = df_merged.get('department', 'Unknown')

    # 3. Apply Filters
    if position:
        df_merged = df_merged[df_merged['filter_position'].astype(str).str.lower() == position.lower()]
    
    if department:
        df_merged = df_merged[df_merged['filter_department'].astype(str).str.lower() == department.lower()]

    if df_merged.empty:
        return {"success": True, "data": []}

    # 4. Resample / Group by Time
    # Set the date as index for resampling
    df_merged.set_index('submission_date', inplace=True)
    
    # Define Resampling Rule
    # 'D' = Daily, 'W' = Weekly (ending Sunday), 'ME' = Month End
    rule_map = {
        'daily': 'D',
        'weekly': 'W', 
        'monthly': 'ME' 
    }
    resample_rule = rule_map.get(granularity.lower(), 'W')

    # Aggregation logic
    agg_funcs = {
        'engagement_rate': 'mean',
        'burnout_rate': 'mean',
        'attrition_rate': 'mean'
    }
    
    # Perform Resampling
    # We assume 'engagement_rate' etc are already numeric. If not, coerce them:
    cols_to_numeric = ['engagement_rate', 'burnout_rate', 'attrition_rate']
    for col in cols_to_numeric:
        if col in df_merged.columns:
            df_merged[col] = pd.to_numeric(df_merged[col], errors='coerce')

    # Resample and calculate mean, dropping periods with no data
    trend_data = df_merged[cols_to_numeric].resample(resample_rule).mean().dropna(how='all')

    # 5. Format Output
    results = []
    
    for date_idx, row in trend_data.iterrows():
        
        # Format Date Label based on Granularity
        if granularity.lower() == 'daily':
            date_label = date_idx.strftime('%b %d') # "Jan 15"
        elif granularity.lower() == 'monthly':
            date_label = date_idx.strftime('%B %Y') # "January 2024"
        else: # weekly
            # Calculate Week Number and Year, or "Week of Jan 15"
            # Option A: "Week 3"
            # date_label = f"Week {date_idx.isocalendar()[1]}"
            # Option B: "Jan 15" (Start of week usually preferred for charts)
            # Since resample 'W' defaults to end of week, let's just format readable:
            date_label = f"Week {date_idx.isocalendar()[1]} ({date_idx.strftime('%b %d')})"

        # Handle Scores (Round and handle NaN)
        eng = round(row['engagement_rate'], 1) if not pd.isna(row['engagement_rate']) else 0
        burn = round(row['burnout_rate'], 1) if not pd.isna(row['burnout_rate']) else 0
        att = round(row['attrition_rate'], 1) if not pd.isna(row['attrition_rate']) else 0

        results.append({
            "date": date_label,
            "engagement": eng,
            "burnout": burn,
            "attrition": att
        })

    return {
        "success": True,
        "data": results
    }

