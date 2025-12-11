from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
from datetime import datetime
import json

router = APIRouter(
    prefix="/ws",
    tags=["WebSocket"]
)

class ConnectionManager:
    """Manages WebSocket connections for real-time alerts"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        """Accept and store new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"Client disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: Dict[str, Any]):
        """Send message to all connected clients"""
        if not self.active_connections:
            print("No active connections to broadcast to")
            return
        
        message_json = json.dumps(message)
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message_json)
            except Exception as e:
                print(f"Error sending to client: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)
    
    async def send_personal(self, message: Dict[str, Any], websocket: WebSocket):
        """Send message to specific client"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            print(f"Error sending personal message: {e}")


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time risk alerts.
    
    Clients connect to: ws://localhost:8000/api/v1/ws/alerts
    
    Alert Types:
    - department_critical: When department overall_risk becomes "critical"
    - employee_stress: When employee stress_rate > 40
    
    Message Format:
    {
        "type": "department_critical" | "employee_stress",
        "timestamp": "ISO-8601 datetime",
        "data": {
            // Department alert
            "department_name": "string",
            "department_id": "string",
            "overall_risk": "critical",
            "engagement_score": float,
            
            // Employee alert
            "employee_id": "string",
            "department": "string",
            "stress_rate": float,
            "engagement_rate": float
        }
    }
    """
    await manager.connect(websocket)
    
    # Send welcome message
    await manager.send_personal({
        "type": "connection",
        "message": "Connected to risk monitoring alerts",
        "timestamp": datetime.now().isoformat()
    }, websocket)
    
    try:
        # Keep connection alive and listen for client messages (if any)
        while True:
            data = await websocket.receive_text()
            # Echo back or handle client requests if needed
            if data == "ping":
                await manager.send_personal({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
