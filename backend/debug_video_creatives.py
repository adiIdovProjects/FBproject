
import os
import sys
import logging
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adcreative import AdCreative
from facebook_business.adobjects.advideo import AdVideo
from dotenv import load_dotenv
import pandas as pd

# Load env vars
load_dotenv()

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from extractors.fb_api import FacebookExtractor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DebugVideoCreatives")

def debug_video_creatives():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    account_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
    
    if not all([app_id, app_secret, access_token, account_id]):
        logger.error("Missing credentials")
        return

    FacebookAdsApi.init(app_id, app_secret, access_token)
    
    extractor = FacebookExtractor()
    if not extractor.initialize():
        logger.error("Failed to initialize extractor")
        return
    
    logger.info("Fetching creatives using extractor...")
    
    try:
        # Get some recent creative IDs
        account = AdAccount(f'act_{account_id}')
        ads = account.get_ads(fields=['creative'], params={'limit': 10})
        creative_ids = [a['creative']['id'] for a in ads if 'creative' in a]
        
        if not creative_ids:
            logger.warning("No creative IDs found")
            return
            
        df_creatives = extractor.get_creative_details(creative_ids)
        
        if df_creatives.empty:
            logger.warning("No creative details fetched")
            return
            
        print("\nCreative Details Fetched:")
        cols = ['creative_id', 'is_video']
        if 'video_url' in df_creatives.columns: cols.append('video_url')
        if 'image_url' in df_creatives.columns: cols.append('image_url')
        if 'video_length_seconds' in df_creatives.columns: cols.append('video_length_seconds')
        
        print(df_creatives[cols].to_string())
        
        # Check if we have any videos with data
        if 'is_video' in df_creatives.columns:
            videos = df_creatives[df_creatives['is_video'] == True]
            if not videos.empty:
                print(f"\nFound {len(videos)} videos with data!")
            else:
                print("\nNo videos found in the sample.")

    except Exception as e:
        logger.error(f"Failed in debug script: {e}")

if __name__ == "__main__":
    debug_video_creatives()
