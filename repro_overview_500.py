
import requests
import json
from datetime import date

BASE_URL = 'http://localhost:8080/api/v1'

def test_metrics_overview(start_date, end_date):
    url = f'{BASE_URL}/metrics/overview'
    params = {
        'start_date': start_date,
        'end_date': end_date,
        'compare_to_previous': 'true'
    }
    print(f"Testing {url} with params {params}")
    try:
        resp = requests.get(url, params=params)
        print(f"Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Error: {resp.text}")
        else:
            print("Success!")
            # print(json.dumps(resp.json(), indent=2))
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    # Test with a range that likely has no data to trigger _empty_metrics
    test_metrics_overview('2025-01-01', '2025-01-01')
    # Test with a range that likely has data
    test_metrics_overview('2024-10-01', '2024-10-31')
