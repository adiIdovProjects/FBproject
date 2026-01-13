
import os
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adsinsights import AdsInsights
from dotenv import load_dotenv
import json
from datetime import datetime, timedelta

load_dotenv()

def debug_raw_video_metrics():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    account_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    account = AdAccount(f'act_{account_id}')
    
    # Yesterday
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    
    print(f"Testing video metrics for {yesterday}...")
    
    fields = [
        'ad_id',
        'ad_name',
        'spend',
        'video_play_actions',
        'video_p25_watched_actions',
        'video_p50_watched_actions',
        'video_p75_watched_actions',
        'video_p100_watched_actions',
        'video_avg_time_watched_actions'
    ]
    
    params = {
        'level': 'ad',
        'time_range': {'since': yesterday, 'until': yesterday},
        'limit': 20
    }
    
    try:
        insights = account.get_insights(fields=fields, params=params)
        data = [dict(i) for i in insights]
        
        if not data:
            print("No data found for yesterday. Trying last 7 days...")
            last_7 = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
            params['time_range'] = {'since': last_7, 'until': yesterday}
            insights = account.get_insights(fields=fields, params=params)
            data = [dict(i) for i in insights]

        if not data:
            print("Still no data found.")
            return

        print(f"Found {len(data)} rows.")
        for row in data:
            has_video = any(k in row for k in ['video_play_actions', 'video_p25_watched_actions'])
            if has_video:
                print(f"--- Ad: {row.get('ad_name')} ({row.get('ad_id')}) ---")
                for field in fields[3:]:
                    if field in row:
                        print(f"  {field}: {row[field]}")
                    else:
                        print(f"  {field}: MISSING")
            else:
                # print(f"Ad: {row.get('ad_name')} - No video metric fields found in response")
                pass

    except Exception as e:
        print(f"Failed to pull video metrics: {e}")

if __name__ == "__main__":
    debug_raw_video_metrics()
