from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
import os
import tempfile
import shutil
import pandas as pd
import uuid
import math
import decimal
from decimal import Decimal
from dynamo.connection import dynamo
import boto3
import traceback
from datetime import datetime
from utils.quarter import get_quarter
from utils.season_detect import classify_festival_date
from utils.risk_engine_helpers import calculate_row_metrics
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache

router = APIRouter(
    prefix="/upload",
    tags=["Upload"]
)

# In-memory storage for task status
upload_tasks = {}

# --- Mapping Configuration ---
# Map Survey Questions (Q1-Q30) to Dimensions
DIMENSION_MAPPING = {
    "Dim_Enablement": ["Q3_Enablement_Tools", "Q11_Systems_Process", "Q29_Health_Safety"],
    "Dim_ESG": ["Q8_ESG_Community", "Q16_ESG_Environment"],
    "Dim_Delight_Customer": ["Q5_Quality_Services", "Q13_Great_Service", "Q20_Cust_Feedback_Usage", "Q27_Delight_Cust"],
    "Dim_Development": ["Q4_Sup_Career_Interest", "Q12_Career_Opp", "Q19_L&D_Access"],
    "Dim_Culture_Values": ["Q7_Diversity_Inclusion", "Q15_Respect", "Q21_Values_Lived"],
    "Dim_Company_Confidence": ["Q6_Trust_Top_Mgmt", "Q14_Future_Success", "Q24_Sup_Comm_Strategy"],
    "Dim_Leadership": ["Q2_Sup_Feedback", "Q10_Sup_Informed", "Q18_Sup_Role_Model", "Q30_Sup_Recognize"],
    "Dim_Employee_Engagement": ["Q1_Recommend", "Q9_Proud_Work", "Q22_Motivated_More", "Q23_Job_Sat", "Q25_Excited_Work", "Q28_Stay_2_Years"]
}

def safe_decimal(value, allow_none=True):
    """Convert a value to Decimal, handling NaN, None, and empty values."""
    if value is None: return None if allow_none else Decimal('0')
    if pd.isna(value): return None if allow_none else Decimal('0')
    if isinstance(value, str) and value.strip() == '': return None if allow_none else Decimal('0')
    if isinstance(value, float) and math.isnan(value): return None if allow_none else Decimal('0')
    try:
        # Round to 2 decimal places for storage
        return Decimal(str(value)).quantize(Decimal("0.01"), rounding=decimal.ROUND_HALF_UP)
    except (ValueError, TypeError, decimal.InvalidOperation):
        return None if allow_none else Decimal('0')

def safe_string(value):
    if pd.isna(value): return ""
    return str(value)

def add_to_dynamodb(table_name, item):
    dynamodb = boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION"))
    table = dynamodb.Table(table_name)
    table.put_item(Item=item)

def get_partial_data_from_dynamodb(table_name, limit=10):
    dynamodb = boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION"))
    table = dynamodb.Table(table_name)
    response = table.scan(Limit=limit)
    return response.get("Items", [])

def calculate_dimensions(df: pd.DataFrame) -> pd.DataFrame:
    """Calculates Dimension scores based on question columns."""
    for dim_name, cols in DIMENSION_MAPPING.items():
        # Find columns in DF that match the mapping keys (fuzzy or exact)
        available_cols = []
        for map_col in cols:
            # Look for columns in dataframe that start with the mapping key (e.g. "Q1_")
            matches = [c for c in df.columns if c.startswith(map_col.split('_')[0] + "_")]
            if matches:
                available_cols.append(matches[0])
        
        if available_cols:
            # Calculate row-wise mean for this dimension
            df[dim_name] = df[available_cols].mean(axis=1)
        else:
            df[dim_name] = 0.0
    return df

def calculate_overall_risk(engagement, attrition, stress):
    """Determines overall risk status."""
    # Logic: 
    # Engagement < 55 -> Critical
    # Stress > 50 -> Critical
    # Attrition > 50 -> Critical
    e = float(engagement) if engagement else 0
    a = float(attrition) if attrition else 0
    s = float(stress) if stress else 0
    
    if e < 55 or s > 50 or a > 50:
        return "critical"
    if e < 65 or s > 35 or a > 35:
        return "warning"
    return "healthy"

def update_employees_from_survey(df: pd.DataFrame):
    """Updates the Employees table with latest metrics."""
    dynamodb = boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION"))
    table = dynamodb.Table("Employees")
    
    print(f"Updating {len(df)} Employee records...")
    
    timestamp = datetime.now().isoformat()
    
    for _, row in df.iterrows():
        emp_id = safe_string(row.get("mployee_id") or row.get("employee_id"))
        if not emp_id: continue

        # Construct UpdateExpression dynamically based on available columns
        update_parts = []
        attr_values = {}
        attr_names = {}
        
        # Metrics to update
        metrics_map = {
            "engagement_rate": row.get("engagement_rate"),
            "attrition_rate": row.get("attrition_rate"),
            "stress_rate": row.get("burnout_rate"), # Mapping burnout -> stress
            "metrics_updated_at": timestamp
        }
        
        # Add Dimensions
        for dim in DIMENSION_MAPPING.keys():
            if dim in row:
                metrics_map[dim] = row[dim]

        # Build Expression
        for key, val in metrics_map.items():
            if val is not None and not pd.isna(val):
                # Use #k for key names to avoid reserved word conflicts
                safe_key_name = f"#{key}" 
                safe_val_name = f":{key}"
                
                update_parts.append(f"{safe_key_name} = {safe_val_name}")
                attr_names[safe_key_name] = key
                if key == "metrics_updated_at":
                    attr_values[safe_val_name] = val
                else:
                    attr_values[safe_val_name] = safe_decimal(val)

        if not update_parts:
            continue

        try:
            table.update_item(
                Key={'Employee_ID': emp_id},
                UpdateExpression="SET " + ", ".join(update_parts),
                ExpressionAttributeNames=attr_names,
                ExpressionAttributeValues=attr_values
            )
        except Exception as e:
            print(f"Failed to update Employee {emp_id}: {e}")

def update_departments_from_survey(df: pd.DataFrame):
    """Aggregates metrics and updates Departments table."""
    dynamodb = boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION"))
    dept_table = dynamodb.Table("Departments")
    
    # 1. Group by Department
    # Normalize department column name
    dept_col = 'department' if 'department' in df.columns else 'Department'
    if dept_col not in df.columns:
        print("No Department column found for aggregation.")
        return

    # Calculate aggregations
    agg_dict = {
        "engagement_rate": "mean",
        "attrition_rate": "mean",
        "burnout_rate": "mean" # Maps to stress_rate
    }
    for dim in DIMENSION_MAPPING.keys():
        agg_dict[dim] = "mean"

    # Group
    dept_stats = df.groupby(dept_col).agg(agg_dict).reset_index()
    
    # 2. Need Department IDs. Fetch current Departments to create a lookup map.
    # We update based on Dept ID, but CSV usually only has Name.
    scan_resp = dept_table.scan()
    existing_depts = scan_resp.get('Items', [])
    
    # Map: Name -> ID
    dept_map = {d.get('department_name'): d.get('department_id') for d in existing_depts if d.get('department_name')}
    
    print(f"Updating {len(dept_stats)} Departments...")
    timestamp = datetime.now().isoformat()

    for _, row in dept_stats.iterrows():
        dept_name = row[dept_col]
        dept_id = dept_map.get(dept_name)
        
        if not dept_id:
            print(f"Skipping Department update for '{dept_name}' (ID not found in DB).")
            continue

        # Prepare values
        eng = safe_decimal(row["engagement_rate"])
        att = safe_decimal(row["attrition_rate"])
        stress = safe_decimal(row["burnout_rate"])
        
        overall_risk = calculate_overall_risk(eng, att, stress)

        # Construct Update
        update_parts = []
        attr_values = {}
        attr_names = {}

        # Standard Metrics
        updates = {
            "engagement_rate": eng,
            "attrition_rate": att,
            "stress_rate": stress,
            "overall_risk": overall_risk,
            "metrics_updated_at": timestamp
        }

        # Dimensions
        for dim in DIMENSION_MAPPING.keys():
            if dim in row:
                updates[dim] = safe_decimal(row[dim])

        for key, val in updates.items():
            safe_key = f"#{key}"
            safe_val = f":{key}"
            update_parts.append(f"{safe_key} = {safe_val}")
            attr_names[safe_key] = key
            attr_values[safe_val] = val

        try:
            dept_table.update_item(
                Key={'department_id': dept_id},
                UpdateExpression="SET " + ", ".join(update_parts),
                ExpressionAttributeNames=attr_names,
                ExpressionAttributeValues=attr_values
            )
        except Exception as e:
            print(f"Failed to update Department {dept_name}: {e}")

def process_file_background(task_id: str, file_path: str, original_filename: str):
    """Background task to process the CSV file."""
    try:
        upload_tasks[task_id]["status"] = "processing"
        upload_tasks[task_id]["message"] = "Reading file and initializing NLP pipeline..."
        
        print(f"Reading uploaded file: {original_filename}")
        df = pd.read_csv(file_path)
        total_uploaded_rows = len(df)
        
        # 1. Calculate Base Risk Metrics (Engagement, Attrition, Burnout)
        df = calculate_row_metrics(df)

        # 2. Calculate Temporal Fields
        print("Calculating temporal fields...")
        for index, row in df.iterrows():
            try:
                sub_date_raw = row.get("submission_date") or row.get("Submission_Date")
                if pd.notna(sub_date_raw):
                    try:
                        dt = pd.to_datetime(sub_date_raw)
                        df.at[index, 'year'] = dt.year
                        df.at[index, 'month'] = dt.strftime("%B")
                        date_str = dt.strftime("%Y-%m-%d")
                        df.at[index, 'quarter'] = get_quarter(date_str)
                        df.at[index, 'event_season'] = ", ".join(classify_festival_date(date_str, year=dt.year))
                    except: pass
            except: pass
        
        # 3. Calculate Dimension Scores (Dim_Enablement, etc.)
        df = calculate_dimensions(df)

        # 4. Save to Survey_Response Table
        total_rows = len(df)
        upload_tasks[task_id]["message"] = f"Saving {total_rows} records to Survey_Response..."
        saved_count = 0
        
        for index, row in df.iterrows():
            try:
                item = {
                    "response_id": str(uuid.uuid4()),
                    "employee_id": safe_string(row.get("mployee_id", row.get("employee_id", ""))),
                    "submission_date": safe_string(row.get("submission_date", row.get("Submission_Date", ""))),
                    "department": safe_string(row.get("department", row.get("Department", ""))),
                    "location": safe_string(row.get("location", row.get("Location", ""))),
                    "quarter": safe_string(row.get("quarter", "")),
                    "month": safe_string(row.get("month", "")),
                    "year": safe_decimal(row.get("year", 2024)), 
                    "event_season": safe_string(row.get("event_season", "")),
                    
                    # Core Metrics
                    "burnout_rate": safe_decimal(row.get("burnout_rate"), allow_none=True),
                    "attrition_rate": safe_decimal(row.get("attrition_rate"), allow_none=True),
                    "engagement_rate": safe_decimal(row.get("engagement_rate"), allow_none=True),
                }

                # Add Calculated Dimensions to Survey Response
                for dim in DIMENSION_MAPPING.keys():
                    if dim in row:
                        item[dim] = safe_decimal(row[dim])

                # Add Raw Questions (Q1-Q30)
                for i in range(1, 31):
                    prefix = f"Q{i}_"
                    matching_cols = [c for c in df.columns if c.startswith(prefix)]
                    if matching_cols:
                         item[matching_cols[0]] = safe_decimal(row[matching_cols[0]])

                add_to_dynamodb("Survey_Response", item)
                saved_count += 1
            except Exception as e:
                continue
        
        # 5. Update Employees Table
        upload_tasks[task_id]["message"] = "Updating Employee records..."
        update_employees_from_survey(df)

        # 6. Update Departments Table
        upload_tasks[task_id]["message"] = "Updating Department statistics..."
        update_departments_from_survey(df)

        # Final Response Preparation
        partial_data = get_partial_data_from_dynamodb("Survey_Response", limit=10)
        
        def decimal_to_float(obj):
            if isinstance(obj, list): return [decimal_to_float(i) for i in obj]
            elif isinstance(obj, dict): return {k: decimal_to_float(v) for k, v in obj.items()}
            elif isinstance(obj, Decimal): return float(obj)
            return obj
        
        result = {
            "status": "success",
            "filename": original_filename,
            "total_rows_processed": total_rows,
            "total_rows_saved": saved_count,
            "message": "Survey data saved. Employees and Departments updated.",
            "sample_data": decimal_to_float(partial_data)
        }
        
        upload_tasks[task_id]["status"] = "completed"
        upload_tasks[task_id]["message"] = "Processing complete!"
        upload_tasks[task_id]["result"] = result
        
    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        upload_tasks[task_id]["status"] = "failed"
        upload_tasks[task_id]["message"] = f"Error: {str(e)}"
    finally:
        temp_dir = os.path.dirname(file_path)
        shutil.rmtree(temp_dir, ignore_errors=True)

@router.post("/csv")
async def upload_csv(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Only CSV files are accepted.")
    
    temp_dir = tempfile.mkdtemp()
    input_path = os.path.join(temp_dir, "input.csv")
    
    try:
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        task_id = str(uuid.uuid4())
        upload_tasks[task_id] = {
            "status": "pending",
            "message": "File uploaded, starting processing...",
            "result": None
        }
        
        background_tasks.add_task(process_file_background, task_id, input_path, file.filename)
        return {"task_id": task_id, "message": "Upload started. Check status with /status/{task_id}"}
        
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{task_id}")
async def get_upload_status(task_id: str):
    if task_id not in upload_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return upload_tasks[task_id]