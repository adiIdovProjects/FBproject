
import os
import sys
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adsinsights import AdsInsights
from dotenv import load_dotenv
from datetime import date, timedelta

load_dotenv()

def debug_avg_watch():
    app_id = os.getenv('FACEBOOK_APP_ID')
    app_secret = os.getenv('FACEBOOK_APP_SECRET')
    access_token = os.getenv('FACEBOOK_ACCESS_TOKEN')
    account_id = os.getenv('FACEBOOK_AD_ACCOUNT_ID')

    if not all([app_id, app_secret, access_token, account_id]):
        print("Missing environment variables")
        return

    FacebookAdsApi.init(app_id, app_secret, access_token)
    account = AdAccount(f'act_{account_id}')

    fields = [
        'ad_id',
        'ad_name',
        'video_play_actions',
        'video_avg_time_watched_actions'
    ]
    
    end_date = date.today() - timedelta(days=1)
    start_date = end_date - timedelta(days=7)
    
    params = {
        'level': 'ad',
        'time_range': {'since': start_date.isoformat(), 'until': end_date.isoformat()},
        'filtering': [{'field': 'ad.impressions', 'operator': 'GREATER_THAN', 'value': 0}]
    }

    print(f"Fetching insights for {start_date} to {end_date}...")
    try:
        insights = account.get_insights(fields=fields, params=params)
        data = [dict(row) for row in insights]
        
        if not data:
            print("No data found.")
            return

        print(f"Found {len(data)} rows.")
        for row in data:
            ad_name = row.get('ad_name')
            plays = row.get('video_play_actions')
            avg_watch = row.get('video_avg_time_watched_actions')
            
            if plays or avg_watch:
                print(f"Ad: {ad_name}")
                print(f"  Plays: {plays}")
                print(f"  Avg Watch Actions: {avg_watch}")
                
                # Check for other possible avg watch fields
                # Sometimes it might be video_avg_percent_watched_actions
                # or just a numeric field if we didn't use _actions
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_avg_watch()
