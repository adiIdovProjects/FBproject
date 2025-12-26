
import requests
import json
from datetime import datetime, timedelta

BASE_URL = 'http://localhost:8000/api/v1'

def test_campaign_comparison(start_date, end_date, name="Test"):
    url = f'{BASE_URL}/metrics/campaigns/comparison'
    params = {'start_date': start_date, 'end_date': end_date}
    try:
        resp = requests.get(url, params=params)
        print(f"[{name}] {start_date} to {end_date}: Status {resp.status_code}")
        if resp.status_code != 200:
            print(f"ERROR BODY: {resp.text}")
        else:
            data = resp.json()
            print(f"SUCCESS: Got {len(data)} items")
    except Exception as e:
        print(f"EXCEPTION: {e}")

# Test 1: Known good range
test_campaign_comparison('2024-10-01', '2024-11-30', "Good Range")

# Test 2: Range with NO data
test_campaign_comparison('2025-10-01', '2025-11-30', "Future/Empty Range")

# Test 3: Valid range but single day
test_campaign_comparison('2024-10-30', '2024-10-30', "Single Day")

# Test 4: Maximum range
test_campaign_comparison('2020-01-01', '2025-12-31', "Max Range")
