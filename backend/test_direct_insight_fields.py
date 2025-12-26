
import os
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adsinsights import AdsInsights
from facebook_business.adobjects.ad import Ad
from dotenv import load_dotenv
import pandas as pd

load_dotenv()

def test_direct_creative_id_pull():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    account_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    account = AdAccount(f'act_{account_id}')
    
    print("Testing if 'ad_creative_id' works in Insights fields...")
    
    # Try with both potential field names
    fields = [
        'ad_id',
        'ad_name',
        'ad_creative_id',
        'creative_id'
    ]
    
    params = {
        'level': 'ad',
        'time_range': {'since': '2024-09-29', 'until': '2024-09-29'},
        'limit': 5
    }
    
    try:
        insights = account.get_insights(fields=fields, params=params)
        data = [dict(i) for i in insights]
        print(f"Success! Pulled {len(data)} rows.")
        if data:
            print("Sample row fields:")
            print(data[0].keys())
            print(f"Row data: {data[0]}")
    except Exception as e:
        print(f"Failed to pull with custom fields: {e}")

if __name__ == "__main__":
    test_direct_creative_id_pull()
