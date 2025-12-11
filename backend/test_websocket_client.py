"""
WebSocket Test Client for Risk Alerts

This script connects to the WebSocket endpoint and listens for real-time alerts.

Usage:
    python test_websocket_client.py
"""

import asyncio
import websockets
import json
from datetime import datetime


async def test_websocket_connection():
    """Connect to WebSocket and listen for alerts"""
    uri = "ws://localhost:8000/api/v1/ws/alerts"
    
    print(f"🔌 Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected successfully!")
            print("👂 Listening for alerts... (Press Ctrl+C to stop)\n")
            
            # Send ping every 30 seconds to keep connection alive
            async def send_ping():
                while True:
                    await asyncio.sleep(30)
                    await websocket.send("ping")
            
            # Start ping task
            ping_task = asyncio.create_task(send_ping())
            
            try:
                # Listen for messages
                async for message in websocket:
                    data = json.loads(message)
                    
                    # Format and display the alert
                    alert_type = data.get('type', 'unknown')
                    timestamp = data.get('timestamp', datetime.now().isoformat())
                    
                    print(f"\n{'='*60}")
                    print(f"🚨 ALERT RECEIVED at {timestamp}")
                    print(f"{'='*60}")
                    
                    if alert_type == "connection":
                        print(f"📡 {data.get('message')}")
                    
                    elif alert_type == "pong":
                        print(f"🏓 Pong received (connection alive)")
                    
                    elif alert_type == "department_critical":
                        dept_data = data.get('data', {})
                        print(f"⚠️  CRITICAL DEPARTMENT RISK")
                        print(f"   Department: {dept_data.get('department_name')}")
                        print(f"   Department ID: {dept_data.get('department_id')}")
                        print(f"   Risk Level: {dept_data.get('overall_risk').upper()}")
                        print(f"   Engagement Score: {dept_data.get('engagement_score')}")
                    
                    elif alert_type == "employee_stress":
                        emp_data = data.get('data', {})
                        print(f"😰 HIGH EMPLOYEE STRESS")
                        print(f"   Employee ID: {emp_data.get('employee_id')}")
                        print(f"   Name: {emp_data.get('employee_name')}")
                        print(f"   Department: {emp_data.get('department')}")
                        print(f"   Position: {emp_data.get('position')}")
                        print(f"   Stress Rate: {emp_data.get('stress_rate')}%")
                        print(f"   Engagement Rate: {emp_data.get('engagement_rate')}%")
                        print(f"   Attrition Rate: {emp_data.get('attrition_rate')}%")
                    
                    else:
                        print(f"📨 Unknown alert type: {alert_type}")
                        print(f"   Data: {json.dumps(data, indent=2)}")
                    
                    print(f"{'='*60}\n")
            
            except KeyboardInterrupt:
                print("\n\n👋 Disconnecting...")
                ping_task.cancel()
    
    except websockets.exceptions.WebSocketException as e:
        print(f"❌ WebSocket error: {e}")
    except ConnectionRefusedError:
        print(f"❌ Connection refused. Is the server running on localhost:8000?")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("WebSocket Risk Alert Test Client")
    print("=" * 60)
    print()
    
    try:
        asyncio.run(test_websocket_connection())
    except KeyboardInterrupt:
        print("\n\n✅ Test client stopped.")
