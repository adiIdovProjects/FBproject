
import os
import sys
import logging
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.ad import Ad
from dotenv import load_dotenv
import pandas as pd

# Load env vars
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DebugCreatives")

def debug_creatives():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    account_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
    
    if not all([app_id, app_secret, access_token, account_id]):
        logger.error("Missing credentials")
        return

    FacebookAdsApi.init(app_id, app_secret, access_token)
    account = AdAccount(f'act_{account_id}')
    
    logger.info("Fetching ads to check creative field...")
    
    try:
        # Request same fields as in fb_api.py
        fields = [Ad.Field.id, Ad.Field.name, Ad.Field.status, Ad.Field.adset_id, Ad.Field.creative, 'effective_status']
        ads = account.get_ads(fields=fields, params={'limit': 10})
        
        data = [dict(a) for a in ads]
        logger.info(f"Fetched {len(data)} ads")
        
        for i, ad in enumerate(data):
            logger.info(f"Ad {i}: ID={ad.get('id')}, Name={ad.get('name')}")
            creative = ad.get('creative')
            logger.info(f"  Creative Raw: {creative} (Type: {type(creative)})")
            
            if creative and isinstance(creative, dict):
                cid = creative.get('id')
                logger.info(f"  Creative ID extracted: {cid}")
            else:
                logger.warning("  No creative dict found!")

    except Exception as e:
        logger.error(f"Failed to fetch ads: {e}")

if __name__ == "__main__":
    debug_creatives()
