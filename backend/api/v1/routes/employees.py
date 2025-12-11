from fastapi import APIRouter, HTTPException, Query
from fastapi_cache.decorator import cache
from fastapi_cache import FastAPICache
import boto3
from boto3.dynamodb.conditions import Key, Attr
import os
from decimal import Decimal
from typing import List, Dict, Optional, Any
import base64
import json
from datetime import datetime
from collections import defaultdict
from openai import OpenAI
from pydantic import BaseModel
from fastapi import Path

router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)

client = OpenAI(
    base_url="http://localhost:11434/v1", 
    api_key="ollama"
)

# Initialize Tables
dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION'))
table_employees = dynamodb.Table('Employees')
table_feedbacks = dynamodb.Table('Feedbacks')
table_workloads = dynamodb.Table('Employee_Workload')


class ActionItem(BaseModel):
    title: str
    description: str
    priority: str # High, Medium, Low

class RecommendationResponse(BaseModel):
    employee_id: str
    recommendations: List[ActionItem]


def convert_decimal(obj):
    """Helper to convert DynamoDB Decimals to float/int for JSON serialization."""
    if isinstance(obj, list):
        return [convert_decimal(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return float(obj) if obj % 1 else int(obj)
    return obj

def calculate_employee_risk(sentiment_score: float, sentiment_label: str) -> str:
    if sentiment_score is None:
        return "healthy"
    
    score = float(sentiment_score)
    if score > 1.0: score = score / 100.0 # Normalize

    if sentiment_label and sentiment_label.lower() == 'negative':
        return 'critical'
    
    if score >= 0.6: return 'healthy'
    elif score >= 0.35: return 'warning'
    else: return 'critical'

def scan_all_items(table):
    """
    Helper to scan an ENTIRE table (handling DynamoDB 1MB pagination internally).
    WARNING: Expensive operation for large tables.
    """
    items = []
    response = table.scan()
    items.extend(response.get('Items', []))
    
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response.get('Items', []))
        
    return items

def enrich_employee_data(employee, feedbacks, workloads):
    """
    Core Logic: Merges Employee + Feedback + Workload.
    Calculates Risk and Weekly Averages.
    """
    emp_id = employee.get('Employee_ID')

    # 1. Process Feedback (Find latest)
    # -----------------------------------
    # Filter feedbacks for this employee
    emp_feedbacks = [f for f in feedbacks if f.get('employee_id') == emp_id]
    
    # Sort by date descending
    emp_feedbacks.sort(key=lambda x: x.get('submission_date', ''), reverse=True)
    
    latest_fb = emp_feedbacks[0] if emp_feedbacks else None
    
    sentiment_score = latest_fb.get('sentiment_score') if latest_fb else None
    sentiment_label = latest_fb.get('sentiment_label') if latest_fb else None
    
    comment_content = None
    if latest_fb:
        comment_content = latest_fb.get('rephrased_comments') or latest_fb.get('comments')

    # 2. Process Workload (Calculate Weekly Avg)
    # ------------------------------------------
    # Filter workloads for this employee
    emp_workloads = [w for w in workloads if w.get('employee_id') == emp_id]
    
    workload_map = defaultdict(float) # {'2023-40': 45.0, '2023-41': 30.0}

    for wl in emp_workloads:
        date_str = wl.get('date')
        hours = float(wl.get('hours_logged', 0))
        if date_str:
            try:
                dt = datetime.strptime(date_str, '%Y-%m-%d')
                # ISO Week format: "2023-45"
                week_key = f"{dt.year}-{dt.isocalendar()[1]:02d}"
                workload_map[week_key] += hours
            except ValueError:
                continue

    avg_workload = 0.0
    current_workload = 0.0

    if workload_map:
        # Average across all recorded weeks
        avg_workload = sum(workload_map.values()) / len(workload_map)
        
        # Current = The most recent week in the data
        latest_week_key = max(workload_map.keys())
        current_workload = workload_map[latest_week_key]

    # 3. Construct Final Object
    # -------------------------
    return {
        **employee,
        "latest_feedback": {
            "comments": comment_content,
            "date": latest_fb.get('submission_date'),
            "category": latest_fb.get('category')
        } if latest_fb else None,
        "sentiment_score": sentiment_score,
        "risk_status": calculate_employee_risk(sentiment_score, sentiment_label),
        "average_weekly_workload": round(avg_workload, 2),
        "current_weekly_workload": round(current_workload, 2)
    }

# ==========================================
#          ENDPOINT 1: GET ALL (No Page)
# ==========================================

@router.get('/all')
@cache(expire=300)
def get_all_employees_no_pagination(
    departments: Optional[str] = None,
):
    print(departments)
    try:
        # 1. Fetch EVERYTHING
        all_employees = scan_all_items(table_employees)
        all_feedbacks = scan_all_items(table_feedbacks)
        all_workloads = scan_all_items(table_workloads)

        # --- FIX START: ROBUST FILTERING ---
        if departments and departments.lower() != 'all departments':
            # Clean the input
            target_dept = departments.strip().lower()
            
            # Filter safely
            filtered_list = []
            for emp in all_employees:
                # Get division from DB, default to empty string if missing
                emp_division = str(emp.get('division', '')).strip().lower()
                
                if emp_division == target_dept:
                    filtered_list.append(emp)
            
            all_employees = filtered_list
        
        # 2. Process (Pre-grouping Optimization)
        fb_map = defaultdict(list)
        for fb in all_feedbacks:
            fb_map[fb.get('employee_id')].append(fb)
            
        wl_map = defaultdict(list)
        for wl in all_workloads:
            wl_map[wl.get('employee_id')].append(wl)

        # 3. Build Result
        processed_data = []
        for emp in all_employees:
            e_id = emp.get('Employee_ID')
            enriched = enrich_employee_data(emp, fb_map.get(e_id, []), wl_map.get(e_id, []))
            processed_data.append(enriched)

        return {"data": convert_decimal(processed_data)}

    except Exception as e:
        print(f"Error in /all: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
#          ENDPOINT 2: PAGINATED
# ==========================================

# Helper for pagination token
def encode_token(key_dict):
    if not key_dict: return None
    return base64.urlsafe_b64encode(json.dumps(convert_decimal(key_dict)).encode()).decode()

def decode_token(token_str):
    if not token_str: return None
    return json.loads(base64.urlsafe_b64decode(token_str.encode()).decode())

@router.get('/')
def get_employees_paginated(
    limit: int = Query(20, ge=1, le=100),
    next_token: Optional[str] = None
):
    try:
        # 1. Scan One Page of Employees
        scan_kwargs = {'Limit': limit}
        if next_token:
            scan_kwargs['ExclusiveStartKey'] = decode_token(next_token)

        response = table_employees.scan(**scan_kwargs)
        employees = response.get('Items', [])
        last_evaluated_key = response.get('LastEvaluatedKey')

        # 2. Batch Fetch Related Data (Only for these IDs)
        employee_ids = [e.get('Employee_ID') for e in employees]
        
        relevant_feedbacks = []
        relevant_workloads = []

        if employee_ids:
            # DynamoDB 'IN' filter
            fb_response = table_feedbacks.scan(
                FilterExpression=Attr('employee_id').is_in(employee_ids)
            )
            relevant_feedbacks = fb_response.get('Items', [])

            wl_response = table_workloads.scan(
                FilterExpression=Attr('employee_id').is_in(employee_ids)
            )
            relevant_workloads = wl_response.get('Items', [])

        # 3. Process
        processed_data = []
        for emp in employees:
            # We filter the 'relevant' lists (which are small, max 20-100 items usually)
            # No need for complex maps here, list comprehension is fast enough for small N
            
            # Re-use the helper logic
            enriched = enrich_employee_data(emp, relevant_feedbacks, relevant_workloads)
            processed_data.append(enriched)

        return {
            "data": convert_decimal(processed_data),
            "pagination": {
                "limit": limit,
                "total_items_in_page": len(processed_data),
                "next_token": encode_token(last_evaluated_key)
            }
        }

    except Exception as e:
        print(f"Error in /paginated: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cache")
async def clear_cache():
    await FastAPICache.clear()
    return {"success": True, "message": "All cache cleared"}


def generate_ai_recommendations(employee_data, latest_fb_data, avg_workload, current_workload):
    """
    Constructs a prompt and calls LLM. 
    For this code snippet, we simulate the response to ensure it works 
    without you needing an API key immediately.
    """
    # 1. Prepare Data Variables for the Prompt
    emp_id = employee_data.get('Employee_ID', 'Unknown')
    division = employee_data.get('division', 'General')
    position = employee_data.get('position', 'Employee')
    
    # Metrics
    stress = float(employee_data.get('stress_rate') or 0)
    engagement = float(employee_data.get('engagement_rate') or 0)
    sentiment = float(latest_fb_data.get('sentiment_score') or 0) if latest_fb_data else 0
    
    # Text Context
    feedback_text = latest_fb_data.get('comments', 'No recent comments') if latest_fb_data else "No text feedback available."
    feedback_cat = latest_fb_data.get('category', 'General') if latest_fb_data else "General"
    
    # Workload Logic
    workload_delta = current_workload - avg_workload
    if workload_delta > 5:
        workload_context = f"Overworked: Currently working {current_workload}hrs (Avg: {avg_workload}hrs)."
    elif workload_delta < -5:
        workload_context = f"Underutilized or Absent: Currently working {current_workload}hrs (Avg: {avg_workload}hrs)."
    else:
        workload_context = f"Stable: Working {current_workload}hrs, consistent with average."

    # 2. Construct the System Prompt
    system_instruction = """
    You are an expert HR Business Partner and Organizational Psychologist. 
    Your goal is to prevent employee burnout and attrition by prescribing 3 specific actions.
    """

    # 3. Construct the User Prompt
    prompt = f"""
    Analyze this employee's risk profile based on the following metrics:

    [PROFILE]
    - ID: {emp_id} ({position} in {division})
    
    [PSYCHOMETRICS]
    - Stress Level (0-1): {stress:.2f} (High stress is > 0.5)
    - Engagement Rate (0-1): {engagement:.2f} (Low engagement is < 0.5)
    - Sentiment Score (0-100): {sentiment:.1f}
    
    [WORKLOAD CONTEXT]
    - {workload_context}
    
    [QUALITATIVE FEEDBACK]
    - Category: {feedback_cat}
    - Employee Said: "{feedback_text}"

    [TASK]
    Based on the correlation between the stress metrics, workload, and their specific feedback, provide 3 distinct recommended actions for the HR Manager or Team Lead.
    
    1. Immediate Action (High Priority): To stop bleeding/burnout now.
    2. Managerial Adjustment (Medium Priority): A workflow or communication change.
    3. Cultural/Long-term (Medium/Low Priority): A development or wellness step.

    [OUTPUT FORMAT]
    Return ONLY a raw JSON array. Do not use Markdown formatting (no ```json).
    Structure:
    [
        {{
            "title": "Action Title (Max 5 words)",
            "description": "Specific, empathetic, and professional instruction (1-2 sentences).",
            "priority": "High"
        }},
        ...
    ]
    """
    response = client.chat.completions.create(
            model="llama3.2", messages=[{"role": "user", "content": prompt}], temperature=0.7
        )
    return json.loads(response.choices[0].message.content)


@router.post("/{employee_id}/recommendations", response_model=RecommendationResponse)
async def get_employee_recommendations(employee_id: str = Path(..., title="The ID of the employee")):
    try:
        # 1. Fetch Employee
        resp_emp = table_employees.get_item(Key={'Employee_ID': employee_id})
        employee = resp_emp.get('Item')
        if not employee: raise HTTPException(status_code=404, detail="Employee not found")

        # 2. Fetch Feedback
        fb_response = table_feedbacks.scan(FilterExpression=Attr('employee_id').eq(employee_id))
        feedbacks = fb_response.get('Items', [])
        # Get the latest feedback object, not just the text
        feedbacks.sort(key=lambda x: x.get('submission_date', ''), reverse=True)
        latest_fb_data = feedbacks[0] if feedbacks else {}

        # 3. Fetch Workload & Calculate Metrics
        wl_response = table_workloads.scan(FilterExpression=Attr('employee_id').eq(employee_id))
        workloads = wl_response.get('Items', [])
        
        avg_hours = 0.0
        current_hours = 0.0
        
        if workloads:
            # Simple avg calculation (you can reuse the helper from earlier if preferred)
            total_hours = sum(float(w['hours_logged']) for w in workloads)
            avg_hours = round(total_hours / len(workloads), 2)
            # Assume last entry is current for this specific endpoint context
            current_hours = float(workloads[-1]['hours_logged']) if workloads else 0.0

        # 4. Generate Actions
        # PASS ALL DATA TO THE NEW PROMPT FUNCTION
        actions = generate_ai_recommendations(employee, latest_fb_data, avg_hours, current_hours)

        return {
            "employee_id": employee_id,
            "recommendations": actions
        }

    except Exception as e:
        print(f"Error generating actions: {e}")
        raise HTTPException(status_code=500, detail=str(e))