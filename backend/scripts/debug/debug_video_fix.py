
import os
import sys
import logging
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.advideo import AdVideo
from dotenv import load_dotenv

# Load env vars
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DebugVideoFix")

def debug_video_fix():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    account_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    account = AdAccount(f'act_{account_id}')
    
    logger.info("Fetching specific video via AdAccount edge...")
    try:
        # Use a real video ID from previous output: 773563074657360
        target_video_id = '1655583895826235'
        videos = account.get_ad_videos(fields=[
            AdVideo.Field.id,
            AdVideo.Field.source,
            AdVideo.Field.length
        ], params={'filtering': [{'field': 'id', 'operator': 'EQUAL', 'value': target_video_id}]})
        
        for v in videos:
            logger.info(f"MATCH: Video {v.get('id')}: Length={v.get('length')}, Source={v.get('source')[:50]}...")
            
    except Exception as e:
        logger.error(f"Failed to fetch specific video via AdAccount: {e}")

if __name__ == "__main__":
    debug_video_fix()
