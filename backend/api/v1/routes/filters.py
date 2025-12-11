from fastapi import APIRouter
import pandas as pd
from dynamo.fetch import fetch_all_items  # Using the pagination helper from previous steps
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
router = APIRouter(
    prefix="/filters",
    tags=["Filters"] # or "Metadata"
)

@router.get("/")
@cache(expire=3600)
def get_filter_options():
    """
    Returns unique values for Departments, Job Grades, Employee Levels, and Positions.
    Scans the 'Employees' table to ensure filters match actual employee data.
    """
    # 1. Fetch all employee data
    # We use the Employees table because it contains all the demographic fields
    data = fetch_all_items("Employees")
    
    if not data:
        return {
            "departments": [], 
            "positions": [], 
            "jobGrades": [], 
            "employeeLevels": [],
            "locations": []
        }

    df = pd.DataFrame(data)

    # 2. Helper function to extract clean, unique, sorted lists
    def get_unique_values(col_name):
        if col_name not in df.columns:
            return []
        
        # Steps:
        # 1. Drop NaN/None values
        # 2. Convert to string to ensure consistency
        # 3. Strip whitespace
        # 4. Get unique values
        # 5. Sort alphabetically
        return sorted(
            df[col_name]
            .dropna()
            .astype(str)
            .str.strip()
            .unique()
            .tolist()
        )

    # 3. Map Database Columns to API Response Keys
    # Note: 'division' in DB typically maps to 'Department' in UI
    response = {
        "departments": get_unique_values('division'),      
        "positions": get_unique_values('position'),
        "jobGrades": get_unique_values('job_grade'),
        "employeeLevels": get_unique_values('employee_level'),
        "locations": get_unique_values('location')
    }

    return {
        "success": True,
        "data": response
    }
    
@router.delete("/cache")
async def clear_cache():
    """
    Clear ALL cached data.
    With in-memory cache, we usually just clear everything as it's cheap to rebuild.
    """
    await FastAPICache.clear()
    return {"success": True, "message": "All cache cleared"}