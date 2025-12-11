import boto3
import os
from datetime import datetime
from typing import Dict, List, Any, Set
from decimal import Decimal

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'ap-southeast-1'))

# State tracking to prevent duplicate alerts
_alerted_departments: Set[str] = set()
_alerted_employees: Set[str] = set()


def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    return obj


async def check_department_risks(connection_manager) -> List[Dict[str, Any]]:
    """
    Check Departments table for critical overall_risk.
    
    Returns list of alerts to broadcast.
    """
    alerts = []
    
    try:
        table = dynamodb.Table('Departments')
        response = table.scan()
        departments = response.get('Items', [])
        
        # Handle pagination if needed
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            departments.extend(response.get('Items', []))
        
        for dept in departments:
            dept_id = dept.get('department_id')
            dept_name = dept.get('department_name')
            overall_risk = dept.get('overall_risk', '').lower()
            engagement_score = dept.get('engagement_score', 0)
            
            # Check if department is critical and not already alerted
            if overall_risk == 'critical' and dept_id not in _alerted_departments:
                alert = {
                    "type": "department_critical",
                    "timestamp": datetime.now().isoformat(),
                    "data": {
                        "department_id": dept_id,
                        "department_name": dept_name,
                        "overall_risk": overall_risk,
                        "engagement_score": decimal_to_float(engagement_score)
                    }
                }
                alerts.append(alert)
                _alerted_departments.add(dept_id)
                print(f"🚨 ALERT: Department '{dept_name}' is CRITICAL")
            
            # Remove from alerted set if no longer critical
            elif overall_risk != 'critical' and dept_id in _alerted_departments:
                _alerted_departments.remove(dept_id)
                print(f"✅ Department '{dept_name}' is no longer critical")
    
    except Exception as e:
        print(f"Error checking department risks: {e}")
    
    # Broadcast all alerts
    for alert in alerts:
        await connection_manager.broadcast(alert)
    
    return alerts


async def check_employee_stress(connection_manager) -> List[Dict[str, Any]]:
    """
    Check Employees table for stress_rate > 40.
    
    Returns list of alerts to broadcast.
    """
    alerts = []
    
    try:
        table = dynamodb.Table('Employees')
        response = table.scan()
        employees = response.get('Items', [])
        
        # Handle pagination if needed
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            employees.extend(response.get('Items', []))
        
        for emp in employees:
            emp_id = emp.get('Employee_ID')
            stress_rate = emp.get('stress_rate')
            
            # Skip if stress_rate is not available
            if stress_rate is None:
                continue
            
            stress_rate = decimal_to_float(stress_rate)
            
            # Check if stress_rate > 40 and not already alerted
            if stress_rate > 40 and emp_id not in _alerted_employees:
                alert = {
                    "type": "employee_stress",
                    "timestamp": datetime.now().isoformat(),
                    "data": {
                        "employee_id": emp_id,
                        "employee_name": emp.get('name', 'Unknown'),
                        "department": emp.get('division', 'Unknown'),
                        "position": emp.get('position', 'Unknown'),
                        "stress_rate": stress_rate,
                        "engagement_rate": decimal_to_float(emp.get('engagement_rate', 0)),
                        "attrition_rate": decimal_to_float(emp.get('attrition_rate', 0))
                    }
                }
                alerts.append(alert)
                _alerted_employees.add(emp_id)
                print(f"🚨 ALERT: Employee {emp_id} has high stress rate: {stress_rate}")
            
            # Remove from alerted set if stress is now <= 40
            elif stress_rate <= 40 and emp_id in _alerted_employees:
                _alerted_employees.remove(emp_id)
                print(f"✅ Employee {emp_id} stress rate normalized: {stress_rate}")
    
    except Exception as e:
        print(f"Error checking employee stress: {e}")
    
    # Broadcast all alerts
    for alert in alerts:
        await connection_manager.broadcast(alert)
    
    return alerts


async def detect_and_notify(connection_manager):
    """
    Main monitoring function that checks both department and employee risks.
    
    This should be called after data sync operations.
    """
    print("\n🔍 Running risk detection...")
    
    dept_alerts = await check_department_risks(connection_manager)
    emp_alerts = await check_employee_stress(connection_manager)
    
    total_alerts = len(dept_alerts) + len(emp_alerts)
    
    if total_alerts > 0:
        print(f"📢 Sent {total_alerts} alerts ({len(dept_alerts)} dept, {len(emp_alerts)} emp)")
    else:
        print("✓ No new critical risks detected")
    
    return {
        "department_alerts": dept_alerts,
        "employee_alerts": emp_alerts,
        "total": total_alerts
    }


def reset_alert_state():
    """Reset alert tracking state (useful for testing)"""
    global _alerted_departments, _alerted_employees
    _alerted_departments.clear()
    _alerted_employees.clear()
    print("Alert state reset")
