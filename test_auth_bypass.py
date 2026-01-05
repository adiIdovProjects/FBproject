import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

def test_auth_bypass():
    url = "http://localhost:8000/api/v1/metrics/overview?start_date=2025-11-01&end_date=2025-11-30"
    
    print(f"Testing {url} without token...")
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("✅ Success! Auth bypass is working.")
            # print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ Failed! Status Code: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_auth_bypass()
