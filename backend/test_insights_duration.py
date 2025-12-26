import os
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adsinsights import AdsInsights
from dotenv import load_dotenv
import json

load_dotenv()

def test_insights_for_duration():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    account_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    account = AdAccount(f'act_{account_id}')
    
    # Try fetching insights for a video ad with all video-related fields
    fields = [
        'ad_id',
        'video_avg_time_watched_actions',
        'video_p25_watched_actions',
        'video_p50_watched_actions',
        'video_p75_watched_actions',
        'video_p100_watched_actions',
        'video_play_actions'
    ]
    
    print(f"\n--- Fetching Video Insights for Account: {account_id} ---")
    try:
        # Get some recent video ads insights
        params = {
            'level': 'ad',
            'date_preset': 'last_30d',
            'filtering': [{'field': 'video_play_actions', 'operator': 'GREATER_THAN', 'value': 0}],
            'limit': 5
        }
        insights = account.get_insights(fields=fields, params=params)
        
        for i in insights:
            print(f"\nAd ID: {i.get('ad_id')}")
            print(json.dumps(i.export_all_data(), indent=2))
            
            # Can we use avg_time and p100? No, usually avg_time_watched is already a total/count.
            # Actually video_avg_time_watched is sometimes in SECONDS for the average play.
                
    except Exception as e:
        print(f"Error fetching insights: {e}")

if __name__ == "__main__":
    test_insights_for_duration()
