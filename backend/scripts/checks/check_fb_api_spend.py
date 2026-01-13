
import os
import sys
import logging
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from dotenv import load_dotenv

# Load env vars
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DebugFbSpend")

def debug_fb_spend():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    account_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    account = AdAccount(f'act_{account_id}')
    
    # Target date: 2024-09-29
    date_preset = '2024-09-29' 
    # For custom date range we use time_range
    params = {
        'level': 'account',
        'time_range': {'since': '2024-09-29', 'until': '2024-09-29'},
        'fields': ['spend', 'account_id', 'account_name']
    }
    
    try:
        insights = account.get_insights(params=params)
        logger.info(f"\n--- Facebook API Data for {date_preset} ---")
        if not insights:
            logger.info("No insights found for this date.")
        else:
            for row in insights:
                logger.info(f"Account: {row.get('account_name')} ({row.get('account_id')})")
                logger.info(f"Spend: {row.get('spend')} {row.get('currency')}")
                
    except Exception as e:
        logger.error(f"Failed to pull from Facebook API: {e}")

    # Also pull breakdown by campaign to compare with DB
    params_campaign = {
        'level': 'campaign',
        'time_range': {'since': '2024-09-29', 'until': '2024-09-29'},
        'fields': ['campaign_name', 'spend', 'campaign_id'],
        'limit': 50
    }
    
    try:
        campaign_insights = account.get_insights(params=params_campaign)
        logger.info(f"\n--- Facebook API Campaign Breakdown for {date_preset} ---")
        for row in campaign_insights:
            logger.info(f"Campaign: {row.get('campaign_name')} | Spend: {row.get('spend')}")
            
    except Exception as e:
         logger.error(f"Failed to pull campaign breakdown: {e}")

if __name__ == "__main__":
    debug_fb_spend()
