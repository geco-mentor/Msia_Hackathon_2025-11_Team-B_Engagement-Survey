from fastapi import APIRouter, Query, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
import uuid
import boto3
import os
from dotenv import load_dotenv
from dynamo.fetch import fetch_all_items
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache   

# Load environment variables
load_dotenv()

router = APIRouter(
    prefix="/team",
    tags=["Team Risk"]
)

# --- Pydantic Models ---

class PaginationInfo(BaseModel):
    total: int
    limit: int
    offset: int

class TeamRiskData(BaseModel):
    id: str
    position: str
    department: str
    location: str
    employeeCount: int
    engagementScore: float 
    burnoutRisk: str 
    attritionRisk: str 
    overallRisk: str 
    trend: str 
    topDrivers: List[str]
    lastUpdated: str

class TeamRiskResponse(BaseModel):
    success: bool
    data: List[TeamRiskData]
    pagination: PaginationInfo

# --- Constants ---

DRIVER_COLUMNS = [
    'Q1_Recommend', 'Q2_Sup_Feedback', 'Q3_Enablement_Tools', 'Q4_Sup_Career_Interest',
    'Q5_Quality_Services', 'Q6_Trust_Top_Mgmt', 'Q7_Diversity_Inclusion', 'Q8_ESG_Community',
    'Q9_Proud_Work', 'Q10_Sup_Informed', 'Q11_Systems_Process', 'Q12_Career_Opp',
    'Q13_Great_Service', 'Q14_Future_Success', 'Q15_Respect', 'Q16_ESG_Environment',
    'Q17_Rarely_Look_Job', 'Q18_Sup_Role_Model', 'Q19_L&D_Access', 'Q20_Cust_Feedback_Usage',
    'Q21_Values_Lived', 'Q22_Motivated_More', 'Q23_Job_Sat', 'Q24_Sup_Comm_Strategy',
    'Q25_Excited_Work', 'Q26_Comp_Benefits', 'Q27_Delight_Cust', 'Q28_Stay_2_Years',
    'Q29_Health_Safety', 'Q30_Sup_Recognize'
]

# --- Helper Functions ---

def calculate_risk_label(value: float, metric_type: str = 'score') -> str:
    """Returns: healthy | watch | warning | critical"""
    if pd.isna(value):
        return "healthy"

    if metric_type == 'score': 
        # Engagement (Higher is better)
        if value > 75: return 'healthy'
        if value > 65: return 'watch'
        if value >= 55: return 'warning'
        return 'critical'
    else: 
        # Burnout/Attrition (Lower is better)
        if value <= 20: return 'healthy'
        if value <= 35: return 'watch'
        if value <= 50: return 'warning'
        return 'critical'

def determine_overall_risk(eng: str, burn: str, att: str) -> str:
    risk_weights = {'critical': 4, 'warning': 3, 'watch': 2, 'healthy': 1}
    max_risk = max(
        risk_weights.get(eng, 1), 
        risk_weights.get(burn, 1), 
        risk_weights.get(att, 1)
    )
    return {v: k for k, v in risk_weights.items()}[max_risk]

def get_top_drivers(row_data: pd.Series) -> List[str]:
    scores = {}
    for col in DRIVER_COLUMNS:
        if col in row_data and not pd.isna(row_data[col]):
            scores[col] = row_data[col]
    
    if not scores:
        return []
        
    sorted_drivers = sorted(scores.items(), key=lambda item: item[1])
    
    top_3 = []
    for k, v in sorted_drivers[:3]:
        clean_name = k.split('_', 1)[1] if '_' in k else k
        top_3.append(clean_name)
        
    return top_3

# --- Main Endpoint ---

@router.get("/", response_model=TeamRiskResponse)
@cache(expire=3600)
def get_team_risk_data(
    department: Optional[str] = None,
    location: Optional[str] = None,
    job_grade: Optional[str] = None,
    employee_level: Optional[str] = None,
    risk_level: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Dict[str, Any]:
    
    # 1. Fetch Data
    survey_data = fetch_all_items("Survey_Response")
    employee_data = fetch_all_items("Employees")
    
    df_survey = pd.DataFrame(survey_data)
    df_emp = pd.DataFrame(employee_data)

    if df_survey.empty or df_emp.empty:
        return {"success": True, "data": [], "pagination": {"total": 0, "limit": limit, "offset": offset}}

    # 2. Prepare for Merge
    df_survey['employee_id'] = df_survey['employee_id'].astype(str)
    df_emp['Employee_ID'] = df_emp['Employee_ID'].astype(str)

    # 3. Merge
    # Inner join ensures we only count employees who have survey data (or use Left Join if you want all employees)
    df_merged = pd.merge(
        df_survey,
        df_emp,
        left_on='employee_id',
        right_on='Employee_ID',
        how='inner',
        suffixes=('_survey', '_emp')
    )

    # 4. Standardize Columns
    # Division / Department
    df_merged['final_department'] = df_merged.get('division') \
        if 'division' in df_merged.columns \
        else df_merged.get('department', 'Unknown')

    # Location (Used for filtering, but NOT for grouping keys)
    if 'location_emp' in df_merged.columns:
        df_merged['final_location'] = df_merged['location_emp']
    elif 'location_survey' in df_merged.columns:
        df_merged['final_location'] = df_merged['location_survey']
    else:
        df_merged['final_location'] = 'Unknown'

    # Metrics (Fill NaNs with 0)
    df_merged['engagement_rate'] = df_merged.get('engagement_rate_emp').fillna(df_merged.get('engagement_rate_survey', 0))
    df_merged['attrition_rate'] = df_merged.get('attrition_rate_emp').fillna(df_merged.get('attrition_rate_survey', 0))
    
    if 'burnout_rate_emp' in df_merged.columns:
        df_merged['burnout_rate'] = df_merged['burnout_rate_emp'].fillna(0)
    elif 'burnout_rate_survey' in df_merged.columns:
        df_merged['burnout_rate'] = df_merged['burnout_rate_survey'].fillna(0)
    else:
        df_merged['burnout_rate'] = 0

    # 5. Apply Flexible Filters
    # Applying filters BEFORE grouping ensures calculations reflect the filtered dataset
    if department:
        df_merged = df_merged[df_merged['final_department'].astype(str).str.lower() == department.lower()]
    if location:
        df_merged = df_merged[df_merged['final_location'].astype(str).str.lower() == location.lower()]
    if job_grade:
        df_merged = df_merged[df_merged.get('job_grade', '').astype(str).str.lower() == job_grade.lower()]
    if employee_level:
        df_merged = df_merged[df_merged.get('employee_level', '').astype(str).str.lower() == employee_level.lower()]

    if df_merged.empty:
        return {"success": True, "data": [], "pagination": {"total": 0, "limit": limit, "offset": offset}}

    # 6. Grouping Logic - STRICTLY BY DEPARTMENT
    # This guarantees ONE row per Department name.
    group_cols = ['final_department']
    
    agg_ops = {
        'employee_id': 'count',       # Total employees in this dept (matching filters)
        'engagement_rate': 'mean',
        'burnout_rate': 'mean',
        'attrition_rate': 'mean',
        'submission_date': 'max'      # Latest update
    }
    
    # Add driver columns to aggregation
    for col in DRIVER_COLUMNS:
        if col in df_merged.columns:
            agg_ops[col] = 'mean'

    # Perform Grouping
    grouped_df = df_merged.groupby(group_cols).agg(agg_ops).reset_index()

    # 7. Process Results
    results = []
    
    for _, row in grouped_df.iterrows():
        eng_val = float(row.get('engagement_rate', 0))
        burn_val = float(row.get('burnout_rate', 0))
        att_val = float(row.get('attrition_rate', 0))

        risk_eng = calculate_risk_label(eng_val, 'score')
        risk_burn = calculate_risk_label(burn_val, 'rate')
        risk_att = calculate_risk_label(att_val, 'rate')
        overall_risk = determine_overall_risk(risk_eng, risk_burn, risk_att)

        # Filter by Risk Level if requested
        if risk_level and risk_level.lower() != 'all':
            if overall_risk != risk_level.lower():
                continue

        top_drivers = get_top_drivers(row)

        # Determine Location Label
        # If a specific location filter was applied, display that.
        # Otherwise, display "Various" because the department contains mixed locations.
        location_display = location if location else "Various"

        item = {
            "id": str(uuid.uuid4()),
            "position": "All",
            "department": row['final_department'],
            "location": location_display, 
            "employeeCount": int(row['employee_id']),
            "engagementScore": round(eng_val, 1),
            "burnoutRisk": risk_burn,
            "attritionRisk": risk_att,
            "overallRisk": overall_risk,
            "trend": "stable",
            "topDrivers": top_drivers,
            "lastUpdated": row['submission_date'] if not pd.isna(row['submission_date']) else ""
        }
        results.append(item)

    # 8. Pagination
    total_records = len(results)
    start_idx = offset
    end_idx = offset + limit
    paginated_data = results[start_idx:end_idx]

    return {
        "success": True,
        "data": paginated_data,
        "pagination": {
            "total": total_records,
            "limit": limit,
            "offset": offset
        }
    }

@router.delete("/cache")
async def clear_cache():
    await FastAPICache.clear()
    return {"success": True, "message": "All cache cleared"}