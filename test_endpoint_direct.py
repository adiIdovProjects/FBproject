"""
Direct test of creatives endpoint to see actual error
"""
import requests
import json

# Test the endpoint
url = "http://localhost:8000/api/v1/creatives"
params = {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
}

try:
    response = requests.get(url, params=params)
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"\nResponse Body:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
