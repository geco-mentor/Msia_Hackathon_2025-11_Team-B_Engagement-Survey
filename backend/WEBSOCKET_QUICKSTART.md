# WebSocket Real-Time Risk Monitoring - Quick Reference

## 🚀 Quick Start

### 1. Start the Server
```bash
cd backend
uvicorn main:app --reload
```

### 2. Connect to WebSocket
```
ws://localhost:8000/api/v1/ws/alerts
```

### 3. Test with Browser Client
```bash
# Open in browser
start test_websocket.html
```

### 4. Test with Python Client
```bash
python test_websocket_client.py
```

---

## 📊 Alert Thresholds

| Alert Type | Condition | Data Source |
|------------|-----------|-------------|
| **Department Critical** | `overall_risk = "critical"` | Departments table |
| **Employee Stress** | `stress_rate > 40` | Employees table |

---

## 📨 Alert Message Examples

### Department Critical
```json
{
  "type": "department_critical",
  "timestamp": "2025-12-10T09:53:23+08:00",
  "data": {
    "department_name": "Engineering",
    "overall_risk": "critical",
    "engagement_score": 45.5
  }
}
```

### Employee Stress
```json
{
  "type": "employee_stress",
  "timestamp": "2025-12-10T09:53:23+08:00",
  "data": {
    "employee_id": "EMP001",
    "stress_rate": 65.5
  }
}
```

---

## 🔧 Integration Examples

### JavaScript
```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/ws/alerts');
ws.onmessage = (e) => {
  const alert = JSON.parse(e.data);
  console.log(alert.type, alert.data);
};
```

### Python
```python
import asyncio, websockets, json

async def monitor():
    async with websockets.connect('ws://localhost:8000/api/v1/ws/alerts') as ws:
        async for msg in ws:
            alert = json.loads(msg)
            print(alert['type'])

asyncio.run(monitor())
```

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `api/v1/routes/websocket_alerts.py` | WebSocket endpoint & connection manager |
| `utils/risk_monitor.py` | Risk detection & alert broadcasting |
| `test_websocket_client.py` | Python test client |
| `test_websocket.html` | Browser test client |
| `WEBSOCKET_GUIDE.md` | Comprehensive documentation |

---

## 🔍 Troubleshooting

**Can't connect?**
- Ensure server is running: `uvicorn main:app --reload`
- Check endpoint: `ws://localhost:8000/api/v1/ws/alerts`

**No alerts?**
- Upload CSV with high stress employees
- Check server logs for monitoring output
- Verify data in DynamoDB

**Duplicate alerts?**
```python
from utils.risk_monitor import reset_alert_state
reset_alert_state()
```

---

## 📚 Documentation

- **Full Guide**: `WEBSOCKET_GUIDE.md`
- **API Docs**: `http://localhost:8000/docs`
- **Walkthrough**: See artifacts folder

---

## ✅ Verification Checklist

- [x] WebSocket endpoint created
- [x] Connection manager implemented
- [x] Risk monitoring service created
- [x] DB sync integration complete
- [x] Test clients provided
- [x] Documentation complete
- [x] Ready for production use

---

**Need Help?** Check `WEBSOCKET_GUIDE.md` for detailed instructions.
