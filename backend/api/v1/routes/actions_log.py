from fastapi import APIRouter, HTTPException, Path, Body, Query
from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime
from dynamo.connection import dynamo
from dynamo.fetch import fetch_all_items
from botocore.exceptions import ClientError
import pandas as pd
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache

router = APIRouter(
    prefix="/interventions",
    tags=["Interventions"]
)

# Initialize boto3 resource for table-level operations if needed, 
# though dynamo client in connection.py is used for put_item.
# We'll use the client for consistency with feedback.py
TABLE_NAME = "Actions_Log"

class InterventionRequest(BaseModel):
    department: str = Field(..., description="Department UUID")
    action: str = Field(..., description="Action title or description")
    status: str = Field(default="planned", description="planned | in-progress")

class InterventionResponseData(BaseModel):
    id: str
    department_name: str
    action: str
    date: str
    status: str
    createdBy: str
    createdAt: str

class InterventionResponse(BaseModel):
    success: bool
    data: InterventionResponseData

class PatchInterventionRequest(BaseModel):
    status: Optional[str] = Field(None, description="planned | in-progress | completed")
    outcome: Optional[str] = Field(None, description="Outcome of the intervention")

class PatchInterventionResponseData(BaseModel):
    id: str
    department_name: str
    action: str
    date: str
    status: str
    outcome: Optional[str]
    updatedAt: str

class PatchInterventionResponse(BaseModel):
    success: bool
    data: PatchInterventionResponseData

def get_department_name(dept_identifier: str) -> str:
    """
    Fetch department name from Departments table.
    """
    try:
        # Fetch all departments
        items = fetch_all_items("Departments")
        df = pd.DataFrame(items)
        
        if df.empty:
            return "Unknown"
            
        # Check if required columns exist
        if 'department_id' not in df.columns or 'department_name' not in df.columns:
            return "Unknown"
        
        # Try to find department by ID (case-insensitive)
        dept_match = df[df['department_id'].astype(str).str.lower() == dept_identifier.lower()]
        
        if not dept_match.empty:
            return dept_match.iloc[0]['department_name']
        
        # Try to find by name (case-insensitive)
        name_match = df[df['department_name'].astype(str).str.lower() == dept_identifier.lower()]
        
        if not name_match.empty:
            return name_match.iloc[0]['department_id']
        
        # If no match found, return the identifier as is
        return dept_identifier
        
    except Exception as e:
        print(f"Error fetching department name: {e}")
        return "Unknown"

@router.post("/", response_model=InterventionResponse)
@cache(expire=3600)  # Cache for 1 hour
def create_intervention(intervention: InterventionRequest):
    try:
        intervention_id = str(uuid.uuid4())
        created_at = datetime.now()
        created_at_iso = created_at.isoformat()
        year = str(created_at.year)
        
        # Resolve Department Name
        dept_name = get_department_name(intervention.department)
        
        # Construct DynamoDB Item
        item = {
            "Action_ID": {"S": intervention_id},
            "Department": {"S": dept_name}, # Storing resolved name
            "Department_ID": {"S": intervention.department}, # Storing original input for filtering
            "Activity_title": {"S": intervention.action},
            "Description": {"S": intervention.action}, # Mapping action to description as well
            "Activity_status": {"S": intervention.status},
            "createdAt": {"S": created_at_iso},
            "createdBy": {"S": "System"}, # Default as per requirements
            "Position": {"S": "All"}, # Defaulting as it's required but not in input
            "Update_at": {"S": created_at_iso}
        }
        
        dynamo.put_item(
            TableName=TABLE_NAME,
            Item=item
        )
        
        return {
            "success": True,
            "data": {
                "id": intervention_id,
                "department_name": dept_name,
                "action": intervention.action,
                "date": created_at_iso,
                "status": intervention.status,
                "createdBy": "System",
                "createdAt": created_at_iso
            }
        }
    
    except ClientError as e:
        print(f"DynamoDB Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Error creating intervention: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{id}", response_model=PatchInterventionResponse)
def update_intervention(
    id: str = Path(..., description="Intervention ID"),
    update_data: PatchInterventionRequest = Body(...)
):
    try:
        updated_at_iso = datetime.now().isoformat()
        
        update_expression = "SET Update_at = :ua"
        expression_attribute_values = {
            ":ua": {"S": updated_at_iso}
        }
        expression_attribute_names = {}
        
        if update_data.status:
            update_expression += ", Activity_status = :s"
            expression_attribute_values[":s"] = {"S": update_data.status}
            
        if update_data.outcome:
            # Mapping outcome to Outcome attribute (or maybe Description activity?)
            # Prompt implies 'outcome' is a specific field in response. We'll add 'Outcome'.
            update_expression += ", Outcome = :o"
            expression_attribute_values[":o"] = {"S": update_data.outcome}

        # We need to fetch the item first to get other details for the response (like Department, Action)
        # or use ReturnValues="ALL_NEW"
        
        response = dynamo.update_item(
            TableName=TABLE_NAME,
            Key={"Action_ID": {"S": id}},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW"
        )
        
        updated_item = response.get("Attributes")
        if not updated_item:
            raise HTTPException(status_code=404, detail="Intervention not found")
            
        # Parse Response
        
        # Get Dept Name
        dept_id = updated_item.get("Department", {}).get("S", "")
        dept_name = get_department_name(dept_id)
        
        return {
            "success": True,
            "data": {
                "id": updated_item.get("Action_ID", {}).get("S"),
                "department_name": dept_name,
                "action": updated_item.get("Activity_title", {}).get("S"),
                "date": updated_item.get("createdAt", {}).get("S"),
                "status": updated_item.get("Activity_status", {}).get("S"),
                "outcome": updated_item.get("Outcome", {}).get("S"),
                "updatedAt": updated_item.get("Update_at", {}).get("S")
            }
        }

    except ClientError as e:
        print(f"DynamoDB Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Error updating intervention: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# GET endpoint models
class GetInterventionItem(BaseModel):
    Action_ID: str
    department: str
    action: str
    date: str
    status: str
    outcome: Optional[str]
    createdBy: str
    createdAt: str
    updatedAt: str

class PaginationInfo(BaseModel):
    total: int
    limit: int
    offset: int

class GetInterventionsResponse(BaseModel):
    success: bool
    data: list[GetInterventionItem]
    pagination: PaginationInfo

@router.get("/", response_model=GetInterventionsResponse)
def get_interventions(
    status: Optional[str] = Query(None, description="planned | in-progress | completed"),
    department: Optional[str] = Query(None, description="Filter by department UUID"),
    startDate: Optional[str] = Query(None, description="ISO 8601 date"),
    endDate: Optional[str] = Query(None, description="ISO 8601 date"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    try:
        # Fetch all items from Actions_Log
        items = fetch_all_items(TABLE_NAME)
        df = pd.DataFrame(items)
        
        if df.empty:
            return {
                "success": True,
                "data": [],
                "pagination": {"total": 0, "limit": limit, "offset": offset}
            }
        
        # Apply filters
        if status:
            df = df[df['Activity_status'].astype(str).str.lower() == status.lower()]
        
        if department:
            # Filter by Department_ID if it exists, otherwise by Department name
            if 'Department_ID' in df.columns:
                df = df[df['Department_ID'].astype(str).str.lower() == department.lower()]
            else:
                df = df[df['Department'].astype(str).str.lower() == department.lower()]
        
        # Date filtering
        if startDate or endDate:
            df['createdAt_dt'] = pd.to_datetime(df['createdAt'], errors='coerce')
            
            if startDate:
                start_dt = pd.to_datetime(startDate)
                df = df[df['createdAt_dt'] >= start_dt]
            
            if endDate:
                end_dt = pd.to_datetime(endDate)
                df = df[df['createdAt_dt'] <= end_dt]
        
        # Sort by createdAt descending (most recent first)
        if 'createdAt' in df.columns:
            df['createdAt_dt'] = pd.to_datetime(df['createdAt'], errors='coerce')
            df = df.sort_values('createdAt_dt', ascending=False)
        
        # Total count before pagination
        total = len(df)
        
        # Apply pagination
        df_paginated = df.iloc[offset:offset + limit]
        
        # Build response
        data = []
        for _, row in df_paginated.iterrows():
            item = {
                "Action_ID": str(row.get('Action_ID', '')),
                "department": str(row.get('Department', 'Unknown')),
                "action": str(row.get('Activity_title', '')),
                "date": str(row.get('createdAt', '')),
                "status": str(row.get('Activity_status', 'planned')),
                "outcome": str(row.get('Outcome', '')) if pd.notna(row.get('Outcome')) else None,
                "createdBy": str(row.get('createdBy', 'System')),
                "createdAt": str(row.get('createdAt', '')),
                "updatedAt": str(row.get('Update_at', ''))
            }
            data.append(item)
        
        return {
            "success": True,
            "data": data,
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset
            }
        }
    
    except Exception as e:
        print(f"Error fetching interventions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cache")
async def clear_cache():
    """
    Clear ALL cached data.
    With in-memory cache, we usually just clear everything as it's cheap to rebuild.
    """
    await FastAPICache.clear()
    return {"success": True, "message": "All cache cleared"}