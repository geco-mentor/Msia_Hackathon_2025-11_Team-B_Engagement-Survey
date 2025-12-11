import requests
import json

try:
    response = requests.get('http://localhost:8000/api/v1/metrics/summary?dateRange=month')
    with open("debug_response.json", "w") as f:
        json.dump(response.json(), f, indent=2)
except Exception as e:
    with open("debug_response.json", "w") as f:
        f.write(str(e))
