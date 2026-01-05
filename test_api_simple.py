"""Test simple API endpoint"""
import requests

url = "http://localhost:8000/api/v1/metrics/overview"
params = {
    "start_date": "2024-10-01",
    "end_date": "2024-11-30",
    "compare_to_previous": True
}

print(f"Testing: {url}")
print(f"Params: {params}\n")

try:
    response = requests.get(url, params=params, timeout=10)
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\n✓ SUCCESS! Got data:")
        print(f"  Currency: {data.get('currency')}")
        print(f"  Current period spend: {data.get('current_period', {}).get('spend')}")
    else:
        print(f"\n✗ ERROR: {response.status_code}")
        print(response.text[:500])
except Exception as e:
    print(f"\n✗ EXCEPTION: {e}")
