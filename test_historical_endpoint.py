"""
Quick test for the historical analysis endpoint
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests
import json

BASE_URL = "http://localhost:8000"

# Test credentials (adjust if needed)
LOGIN_DATA = {
    "email": "admin@example.com",
    "password": "admin123"
}

def test_historical_analysis():
    """Test the new historical analysis endpoint"""
    print("=" * 60)
    print("Testing Historical Analysis Endpoint")
    print("=" * 60)

    # 1. Login to get token
    print("\n1. Logging in...")
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=LOGIN_DATA)

    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return

    token = response.json().get("access_token")
    print("✅ Login successful")

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test historical analysis endpoint
    print("\n2. Testing /api/v1/insights/historical-analysis...")
    print("   Parameters: lookback_days=90")

    response = requests.get(
        f"{BASE_URL}/api/v1/insights/historical-analysis",
        headers=headers,
        params={"lookback_days": 90}
    )

    print(f"   Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print("\n✅ Endpoint working!")
        print("\n3. Response structure:")
        print(f"   - Has 'analysis': {('analysis' in data)}")
        print(f"   - Has 'data': {('data' in data)}")
        print(f"   - Has 'metadata': {('metadata' in data)}")

        if 'data' in data:
            print(f"\n4. Data details:")
            print(f"   - Weekly trends: {len(data['data'].get('weekly_trends', []))} weeks")
            print(f"   - Seasonality data: {len(data['data'].get('seasonality', []))} days")

            trend_metrics = data['data'].get('trend_metrics', {})
            print(f"\n5. Trend Metrics:")
            print(f"   - Direction: {trend_metrics.get('trend_direction', 'N/A')}")
            print(f"   - Strength: {trend_metrics.get('trend_strength', 0)}%")
            print(f"   - Volatility: {trend_metrics.get('volatility', 0)}%")

            print(f"\n6. AI Analysis Preview (first 500 chars):")
            print(f"   {data.get('analysis', '')[:500]}...")

        print("\n" + "=" * 60)
        print("✅ PHASE 1 HISTORICAL ANALYSIS: SUCCESS!")
        print("=" * 60)

    else:
        print(f"\n❌ Request failed:")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")

if __name__ == "__main__":
    try:
        test_historical_analysis()
    except Exception as e:
        print(f"\n❌ Error during test: {e}")
        import traceback
        traceback.print_exc()
