from utils.risk_engine import analyze_survey_data_from_db
from fastapi import APIRouter, Query, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import pandas as pd
from datetime import datetime, timedelta
import numpy as np
import boto3
from boto3.dynamodb.conditions import Attr
from decimal import Decimal

from dynamo.fetch import fetch_survey_data, fetch_all_items
from utils.risk_engine_helpers import calculate_survey_metrics
from utils.db_sync import perform_full_sync
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache

router = APIRouter(
    prefix="/metrics",
    tags=["Metrics"]
)

def get_cutoff_date(range_type: str) -> datetime:
    now = datetime.now()
    if range_type == 'week':
        return now - timedelta(days=7)
    elif range_type == 'month':
        return now - timedelta(days=30)
    elif range_type == 'quarter':
        return now - timedelta(days=90)
    elif range_type == 'year':
        return now - timedelta(days=365)
    else:
        # Default to month if unknown
        return now - timedelta(days=30)

# --- Response Models ---
class MetricsData(BaseModel):
    totalEmployees: int
    teamsAtRisk: int
    avgEngagement: float
    engagementTrend: float
    burnoutAlerts: int
    attritionRiskCount: int
    feedbackResponseRate: float
    generatedAt: str

class MetricsSummaryResponse(BaseModel):
    success: bool
    data: MetricsData
    sync_status: str

# --- Helper Functions ---


@router.get("/summary", response_model=MetricsSummaryResponse)
@cache(expire=3600)
async def get_metrics_summary(
    dateRange: str = Query("month", description="week | month | quarter | year"),
    department: Optional[str] = Query(None)
):
    try:
        # 1. Fetch RAW Survey Data (Read-Only)
        # We assume this fetches all historical survey responses
        raw_df = fetch_survey_data()
        
        # Handle empty database case
        if raw_df.empty:
            return MetricsSummaryResponse(
                success=True,
                data=MetricsData(
                    totalEmployees=0, teamsAtRisk=0, avgEngagement=0.0,
                    engagementTrend=0.0, burnoutAlerts=0, attritionRiskCount=0,
                    feedbackResponseRate=0.0, generatedAt=datetime.now().isoformat()
                ),
                sync_status="No Data Available"
            )

        # 2. Pre-process Dates
        # Determine the column name (handle common variations)
        date_col = 'submission_date' if 'submission_date' in raw_df.columns else 'Submission_Date'
        
        # Convert to datetime objects, coercing errors to NaT
        raw_df[date_col] = pd.to_datetime(raw_df[date_col], errors='coerce')
        
        # Remove rows with invalid dates
        raw_df = raw_df.dropna(subset=[date_col])

        # 3. Apply Filters (Date & Department)
        cutoff_date = get_cutoff_date(dateRange)
        
        # Filter: Keep data after cutoff
        filtered_df = raw_df[raw_df[date_col] >= cutoff_date].copy()

        # Filter: Department
        if department:
            # Normalize column names just in case
            if 'department' in filtered_df.columns:
                filtered_df = filtered_df[filtered_df['department'].str.lower() == department.lower()]
            elif 'Department' in filtered_df.columns:
                filtered_df = filtered_df[filtered_df['Department'].str.lower() == department.lower()]
        
        # Return empty if filtering removed everything
        if filtered_df.empty:
            return MetricsSummaryResponse(
                success=True,
                data=MetricsData(
                    totalEmployees=0, teamsAtRisk=0, avgEngagement=0.0,
                    engagementTrend=0.0, burnoutAlerts=0, attritionRiskCount=0,
                    feedbackResponseRate=0.0, generatedAt=datetime.now().isoformat()
                ),
                sync_status="No Data for selected range"
            )

        # 4. Calculate Metrics (Row Level)
        # This adds 'engagement_rate', 'stress_rate', 'attrition_rate' to the dataframe
        metrics_df = calculate_survey_metrics(filtered_df)

        # 5. Deduplicate (Snapshot Logic)
        # CRITICAL: For a summary, we only want the LATEST submission per employee 
        # within the selected timeframe.
        # Sort by date descending (newest first) -> Drop duplicates keeping top (newest)
        snapshot_df = metrics_df.sort_values(by=date_col, ascending=False).drop_duplicates(subset=['employee_id'], keep='first')
        
        # 6. Aggregate Final Numbers
        total_emp = len(snapshot_df)

        # Average Engagement (0-100 or 0-1)
        # Ensure we handle NaN if calculation failed for some rows
        avg_eng = 0.0
        if 'engagement_rate' in snapshot_df.columns:
            avg_eng = snapshot_df['engagement_rate'].mean()
            if pd.isna(avg_eng): avg_eng = 0.0

        # Burnout / Attrition Counts (Threshold: > 60 or > 0.6 depending on your scale)
        # Assuming scale is 0-100 based on previous code. If 0-1, change 60 to 0.6.
        burnout_count = 0
        if 'stress_rate' in snapshot_df.columns:
            burnout_count = len(snapshot_df[snapshot_df['stress_rate'] > 60])

        attrition_count = 0
        if 'attrition_rate' in snapshot_df.columns:
            attrition_count = len(snapshot_df[snapshot_df['attrition_rate'] > 60])

        # Teams at Risk Calculation
        teams_risk = 0
        dept_col = 'department' if 'department' in snapshot_df.columns else 'Department'
        
        if dept_col in snapshot_df.columns and 'engagement_rate' in snapshot_df.columns:
            # Group by Department -> Mean Engagement
            dept_scores = snapshot_df.groupby(dept_col)['engagement_rate'].mean()
            # Count departments where Average Engagement < 65 (Raised from 50 to be more sensitive)
            teams_risk = len(dept_scores[dept_scores < 65])

        # 7. Response Rate
        # Fetch total employees to calculate rate
        # We need to know how many employees *should* have responded
        try:
            from dynamo.fetch import fetch_all_items
            all_employees = fetch_all_items("Employees")
            total_possible = len(all_employees)
            
            if total_possible > 0:
                # Calculate percentage
                response_rate = (len(snapshot_df) / total_possible) * 100
                feedback_response_rate = round(response_rate, 1)
            else:
                feedback_response_rate = 0.0
        except Exception as e:
            print(f"Error fetching employees for response rate: {e}")
            feedback_response_rate = 0.0
        
        return MetricsSummaryResponse(
            success=True,
            data=MetricsData(
                totalEmployees=int(total_emp),
                teamsAtRisk=int(teams_risk),
                avgEngagement=round(float(avg_eng), 1),
                engagementTrend=0.0, # Requires comparing current_snapshot vs previous_snapshot
                burnoutAlerts=int(burnout_count),
                attritionRiskCount=int(attrition_count),
                feedbackResponseRate=feedback_response_rate, 
                generatedAt=datetime.now().isoformat()
            ),
            sync_status=f"Read Only | Raw: {len(raw_df)} | After Date: {len(filtered_df)} ({dateRange}) | Final: {len(snapshot_df)}"
        )

    except Exception as e:
        print(f"Error in summary: {e}")
        # Return a 500 but try to give detail
        raise HTTPException(status_code=500, detail=f"Calculation Error: {str(e)}")
        


def filter_metrics(df, department: str = None, quarter: str = None, year: int = None, group_by: str = None):
    # print(df[df["Year"] == year])
    print(department)
    print(quarter)
    print(year)

    # ✅ 1. If no year → use current year
    if year is None:
        year = datetime.now().year

    if "Year" in df.columns:
        df = df[df["Year"] == year]
        
    # ✅ Handle Group By Quarter (Trend Data)
    if group_by == "quarter":
        results = []
        # Get all quarters present in the data or fixed Q1-Q4
        # tailored to the filtered dataframe
        
        # Apply department filter first if present
        if department:
            df = df[df["Department"].str.lower() == department.lower()]
            
        quarters = ["Q1", "Q2", "Q3", "Q4"]
        for q in quarters:
            # Aggregate for this quarter
            # We pass the specific quarter to aggregate_dataframe logic
            # Note: We must filter the df for each quarter agg or let aggregate_dataframe handle it?
            # aggregate_dataframe assumes we pass it a df. 
            # We should probably filter the df for the quarter first to be safe/calcuations correct.
            
            q_df = df[df["Quarter"].str.upper() == q.upper()]
            
            if q_df.empty:
                # Return null values for missing data so chart can interpolate
                # rather than showing misleading zeros
                res = {
                    "Department": department if department else "All",
                    "Quarter": q,
                    "Year": year,
                    "Response_Count": 0,
                    "Burnout_Rate": None,
                    "Turnover_Risk": None,
                    "eNPS": None,
                    "Overall_Engagement": None
                }
                results.append(res)
            else:
                res = aggregate_dataframe(
                    q_df,
                    department_name=department if department else "All",
                    year=year,
                    quarter=q
                )
                results.append(res)
        return results

    # ✅ 2. Apply quarter filter even when department is missing
    if quarter:
        df = df[df["Quarter"].str.upper() == quarter.upper()]
        print(df.head())

    # ✅ 3. Apply department filter when present
    if department:
        df = df[df["Department"].str.lower() == department.lower()]

        # Case A: department + quarter → detailed rows
        if quarter:
            return df.applymap(lambda x: x.item() if hasattr(x, "item") else x)\
                     .to_dict(orient="records")

        # Case B: department only → aggregate all quarters
        result = aggregate_dataframe(
            df,
            department_name=department,
            year=year,
            quarter="All"
        )
        return [result]

    # ✅ Case C: quarter only → aggregate all departments
    if quarter and not department:
        result = aggregate_dataframe(
            df,
            department_name="All",
            year=year,
            quarter=quarter
        )
        return [result]

    # ✅ Case D: no dept, no quarter → aggregate everything
    result = aggregate_dataframe(
        df,
        department_name="All",
        year=year,
        quarter="All"
    )
    return [result]




def aggregate_dataframe(df, department_name, year=None, quarter=None):
    sum_columns = [
        "Response_Count",
        "Total_Employees",
        "eNPS_Promoters",
        "eNPS_Passives",
        "eNPS_Detractors"
    ]

    mean_columns = [
        "Response_Rate",
        "Job_Satisfaction",
        "Work_Life_Balance",
        "Manager_Support",
        "Growth_Opportunities",
        "Overall_Engagement",
        "eNPS",
        "Avg_eNPS_Score",
        "Burnout_Score",
        "Burnout_Rate",
        "Turnover_Risk",
        "Avg_Workload",
        "Avg_Sentiment"
    ]

    aggregated = {}

    for col in df.columns:
        if col in sum_columns:
            aggregated[col] = int(df[col].sum())
        elif col in mean_columns:
            mean_val = df[col].mean()
            # Convert NaN to None for JSON serialization
            aggregated[col] = None if pd.isna(mean_val) else float(mean_val)
        else:
            aggregated[col] = "All"

    aggregated["Department"] = department_name
    aggregated["Quarter"] = quarter
    aggregated["Year"] = year

    return aggregated



@router.get("/")
@cache(expire=3600)
async def get_metrics(
    departments: str | None = Query(None),
    quarter: str | None = Query(None),
    year: int | None = Query(None),
    group_by: str | None = Query(None)
):
    if year is None:
        from datetime import datetime
        year = datetime.now().year

    df = analyze_survey_data_from_db()

    filtered = filter_metrics(
        df,
        department=departments,
        quarter=quarter,
        year=year,
        group_by=group_by
    )

    return filtered

def convert_decimals(obj):
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        # Convert to int if it's a whole number, else float
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj

@router.get("/dimensions", response_model=Dict[str, Any])
@cache(expire=3600)
async def get_database_data(
    category: str = Query(..., description="Must be 'departments' or 'employees'"),
    department_name: Optional[str] = Query(None, description="Filter by Department Name"),
    employee_id: Optional[str] = Query(None, description="Filter by Employee ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of items to return per page"),
    offset: int = Query(0, ge=0, description="Number of items to skip")
):
    """
    Retrieves data with pagination.
    
    - **limit**: Max items to return (Default 20).
    - **offset**: Items to skip (Default 0).
    """
    dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION'))

    # 1. Validate Input
    if category.lower() not in ['departments', 'employees']:
        raise HTTPException(status_code=400, detail="Invalid category. Must be 'departments' or 'employees'.")

    try:
        raw_items = []
        is_single_fetch = False

        # ------------------------------------
        # OPTION A: Retrieve Departments
        # ------------------------------------
        if category.lower() == 'departments':
            table = dynamodb.Table('Departments')
            
            if department_name:
                # Specific Filter
                response = table.scan(FilterExpression=Attr('department_name').eq(department_name))
                raw_items = response.get('Items', [])
            else:
                # Fetch All
                response = table.scan()
                raw_items = response.get('Items', [])

        # ------------------------------------
        # OPTION B: Retrieve Employees
        # ------------------------------------
        elif category.lower() == 'employees':
            table = dynamodb.Table('Employees')
            
            if employee_id:
                # Specific Fetch (Fast)
                response = table.get_item(Key={'Employee_ID': employee_id})
                item = response.get('Item')
                raw_items = [item] if item else []
                is_single_fetch = True
            else:
                # Fetch All
                # Note: For very large tables (>1MB), DynamoDB scans are paginated internally by AWS.
                # We loop to get everything so we can apply your requested 'offset'.
                response = table.scan()
                raw_items = response.get('Items', [])
                
                # Handle internal AWS pagination if dataset is huge (>1MB)
                while 'LastEvaluatedKey' in response:
                    response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
                    raw_items.extend(response.get('Items', []))


        total_count = len(raw_items)
        
        # If user asked for specific ID/Name, ignore offset slicing (return all found)
        if is_single_fetch or (category == 'departments' and department_name):
            paginated_data = raw_items
        else:
            # Apply Offset & Limit
            # Example: Offset 0, Limit 20 -> [0:20]
            # Example: Offset 20, Limit 20 -> [20:40]
            start = offset
            end = offset + limit
            paginated_data = raw_items[start:end]

        # ------------------------------------
        # RETURN RESPONSE
        # ------------------------------------
        return {
            "success": True,
            "category": category,
            "pagination": {
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "returned": len(paginated_data)
            },
            "data": convert_decimals(paginated_data)
        }

    except Exception as e:
        print(f"Error retrieving data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dimensions/{employee_id}")
@cache(expire=3600)
async def get_employee_dimension(employee_id: str):
    raw_df = fetch_all_items("Employees")
    df = pd.DataFrame(raw_df)
    print(df.columns)

    # Filter for the employee
    filtered_df = df[df['Employee_ID'] == employee_id]
    
    # Check if employee exists
    if filtered_df.empty:
        return JSONResponse(status_code=404, content={"message": "Employee not found"})
    
    # Get the first (and should be only) row and convert to dict
    item = filtered_df.iloc[0].to_dict()

    return {
        "success": True,
        "data": item
    }
    

@router.delete("/cache")
async def clear_cache():
    """
    Clear ALL cached data.
    With in-memory cache, we usually just clear everything as it's cheap to rebuild.
    """
    await FastAPICache.clear()
    return {"success": True, "message": "All cache cleared"}