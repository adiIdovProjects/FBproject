"""
Debug script to see what fields Facebook API is actually returning
"""
import os
from datetime import date, timedelta
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adsinsights import AdsInsights
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Load credentials
account_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
app_id = os.getenv("FACEBOOK_APP_ID")
app_secret = os.getenv("FACEBOOK_APP_SECRET")

print(f"Account ID: {account_id}")
print(f"App ID: {app_id}")
print(f"Access Token: {'*' * 20 if access_token else 'NOT SET'}")
print()

# Initialize API
FacebookAdsApi.init(app_id, app_secret, access_token)
account = AdAccount(f'act_{account_id}')

# Use specific test date
test_date = '2024-10-28'

print("=" * 80)
print(f"Testing Facebook API - Date: {test_date}")
print("=" * 80)

# Test 1: Get one row to see available fields
print("\n1. Fetching one insight row...")
params = {
    'level': 'ad',
    'time_increment': 1,
    'time_range': {'since': test_date, 'until': test_date},
    'limit': 1,
}

fields = [
    'date_start',
    'campaign_id',
    'adset_id',
    'ad_id',
    'spend',
    'impressions',
    'clicks',
    'inline_link_clicks',
    'outbound_clicks',
]

try:
    insights = account.get_insights(fields=fields, params=params)

    for row in insights:
        data = dict(row)
        print("\n[SUCCESS] Successfully retrieved data!")
        print(f"\nReturned fields ({len(data)} total):")
        for key, value in sorted(data.items()):
            print(f"  {key}: {value}")

        print(f"\n[INFO] Campaign ID from insights: {data.get('campaign_id')}")
        print(f"   Type: {type(data.get('campaign_id'))}")

        # Now try to get campaign metadata for this ID
        campaign_id = data.get('campaign_id')
        if campaign_id:
            print(f"\n2. Trying to fetch campaign metadata for ID: {campaign_id}")
            from facebook_business.adobjects.campaign import Campaign

            try:
                campaign = Campaign(campaign_id)
                campaign_data = campaign.api_get(fields=[
                    Campaign.Field.name,
                    Campaign.Field.status,
                    Campaign.Field.objective
                ]).export_all_data()

                print(f"[SUCCESS] Campaign metadata retrieved!")
                print(f"   ID: {campaign_id}")
                print(f"   Name: {campaign_data.get('name')}")
                print(f"   Status: {campaign_data.get('status')}")
                print(f"   Objective: {campaign_data.get('objective')}")

            except Exception as e:
                print(f"[ERROR] Failed to get campaign metadata: {e}")

        break

except Exception as e:
    print(f"[ERROR] Error fetching insights: {e}")

print("\n" + "=" * 80)
print("Test complete!")
print("=" * 80)
