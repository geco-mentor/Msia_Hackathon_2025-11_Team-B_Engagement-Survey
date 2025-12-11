import boto3
import pandas as pd
from datetime import datetime
from decimal import Decimal
import os
import asyncio
from utils.risk_engine_helpers import calculate_survey_metrics


dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'ap-southeast-1'))

def perform_full_sync(raw_survey_df: pd.DataFrame):
    """
    1. Calculates metrics.
    2. Updates 'Employees' table with latest scores per employee.
    3. Aggregates scores by Department.
    4. Updates 'Departments' table with aggregated scores.
    5. Triggers risk monitoring for WebSocket alerts.
    """
    if raw_survey_df.empty:
        print("No data to sync.")
        return

    # --- Step 1: Process Data ---
    print("Step 1: Calculating Metrics...")
    processed_df = calculate_survey_metrics(raw_survey_df)
    
    # Sort by date to get latest
    date_col = 'submission_date' # Ensure this matches your CSV
    if date_col in processed_df.columns:
        processed_df[date_col] = pd.to_datetime(processed_df[date_col])
        processed_df = processed_df.sort_values(by=date_col, ascending=False)
    
    # Keep only latest submission per employee for the Employee Table Update
    latest_employee_df = processed_df.drop_duplicates(subset=['employee_id'], keep='first')

    # --- Step 2: Sync Employees Table ---
    print(f"Step 2: Syncing {len(latest_employee_df)} Employees...")
    emp_table = dynamodb.Table('Employees')
    
    # List of metrics to save
    metric_cols = [
        'Dim_Employee_Engagement', 'Dim_Leadership', 'Dim_Enablement', 
        'Dim_Development', 'Dim_Delight_Customer', 'Dim_Company_Confidence', 
        'Dim_Culture_Values', 'Dim_ESG',
        'stress_rate', 'engagement_rate', 'attrition_rate'
    ]

    for _, row in latest_employee_df.iterrows():
        emp_id = str(row['employee_id'])
        if not emp_id or emp_id == 'nan': continue

        update_parts = []
        expr_vals = {}
        expr_names = {}

        # A. Update Metrics
        for col in metric_cols:
            if col in row and pd.notna(row[col]):
                # Convert float to Decimal
                val = Decimal(str(row[col]))
                safe_col = col # Column name in DB
                
                update_parts.append(f"#{safe_col} = :{safe_col}")
                expr_names[f"#{safe_col}"] = safe_col
                expr_vals[f":{safe_col}"] = val
        
        # B. Update Division (Map Survey 'department' -> Employee 'division')
        if 'department' in row and pd.notna(row['department']):
            dept_name = str(row['department'])
            update_parts.append("#div = :div")
            expr_names["#div"] = "division" #  specified 'division' col in Employee table
            expr_vals[":div"] = dept_name
            
        # C. Timestamp
        update_parts.append("#ua = :ua")
        expr_names["#ua"] = "metrics_updated_at"
        expr_vals[":ua"] = datetime.now().isoformat()

        if update_parts:
            try:
                emp_table.update_item(
                    Key={'Employee_ID': emp_id}, # Prompt specified 'Employee_ID' (Caps)
                    UpdateExpression="SET " + ", ".join(update_parts),
                    ExpressionAttributeNames=expr_names,
                    ExpressionAttributeValues=expr_vals
                )
            except Exception as e:
                print(f"Error updating Employee {emp_id}: {e}")

    # --- Step 2.5: Check Employee Stress (WebSocket Alert) ---
    print("Step 2.5: Checking employee stress levels...")
    _trigger_employee_stress_check()

    # --- Step 3: Sync Departments Table ---
    print("Step 3: Aggregating and Syncing Departments...")
    dept_table = dynamodb.Table('Departments')
    
    # Get all existing departments to map Name -> ID
    # (Assuming we need department_id to update the table)
    scan_resp = dept_table.scan()
    dept_map = {item['department_name']: item['department_id'] for item in scan_resp.get('Items', []) if 'department_name' in item}

    # Group by 'department' and calculate mean of metrics
    # We use latest_employee_df so we don't double count old surveys from same person
    dept_agg = latest_employee_df.groupby('department')[metric_cols].mean().round(2).reset_index()

    for _, row in dept_agg.iterrows():
        d_name = str(row['department'])
        
        # Determine ID
        d_id = dept_map.get(d_name)
        
        # If department exists in DB, update it. 
        # (If it doesn't exist, you might choose to create it or skip. Here we skip if no ID found)
        if d_id:
            update_parts = []
            expr_vals = {}
            expr_names = {}

            for col in metric_cols:
                val = Decimal(str(row[col]))
                update_parts.append(f"#{col} = :{col}")
                expr_names[f"#{col}"] = col
                expr_vals[f":{col}"] = val

            # Update Timestamp
            update_parts.append("#ua = :ua")
            expr_names["#ua"] = "metrics_updated_at"
            expr_vals[":ua"] = datetime.now().isoformat()

            try:
                dept_table.update_item(
                    Key={'department_id': d_id},
                    UpdateExpression="SET " + ", ".join(update_parts),
                    ExpressionAttributeNames=expr_names,
                    ExpressionAttributeValues=expr_vals
                )
            except Exception as e:
                print(f"Error updating Department {d_name}: {e}")
        else:
            print(f"Skipping Department {d_name} (Not found in Departments table)")

    # --- Step 3.5: Check Department Risks (WebSocket Alert) ---
    print("Step 3.5: Checking department risk levels...")
    _trigger_department_risk_check()

    print("Sync Complete.")


def _trigger_employee_stress_check():
    """Trigger employee stress monitoring (async wrapper)"""
    try:
        from api.v1.routes.websocket_alerts import manager
        from utils.risk_monitor import check_employee_stress
        
        # Run async function in event loop
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        if loop.is_running():
            # If loop is already running, schedule as task
            asyncio.create_task(check_employee_stress(manager))
        else:
            # Run in new loop
            loop.run_until_complete(check_employee_stress(manager))
    except Exception as e:
        print(f"Error triggering employee stress check: {e}")


def _trigger_department_risk_check():
    """Trigger department risk monitoring (async wrapper)"""
    try:
        from api.v1.routes.websocket_alerts import manager
        from utils.risk_monitor import check_department_risks
        
        # Run async function in event loop
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        if loop.is_running():
            # If loop is already running, schedule as task
            asyncio.create_task(check_department_risks(manager))
        else:
            # Run in new loop
            loop.run_until_complete(check_department_risks(manager))
    except Exception as e:
        print(f"Error triggering department risk check: {e}")
