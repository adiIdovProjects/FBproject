
import os
import sys
import pandas as pd
import logging
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from dotenv import load_dotenv

# Load env vars
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DebugAccountTotals")

def debug_account_totals():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    account_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    account = AdAccount(f'act_{account_id}')
    
    params = {
        'level': 'account',
        'date_preset': 'maximum', # Pull everything
        'breakdowns': ['publisher_platform'],
        'fields': ['spend', 'impressions', 'clicks']
    }
    
    try:
        insights = account.get_insights(params=params)
        logger.info(f"Account Totals by Publisher Platform (All Time):")
        for row in insights:
            logger.info(f"  - {row['publisher_platform']}: Spend={row['spend']}, Impressions={row['impressions']}, Clicks={row.get('clicks', 0)}")
            
    except Exception as e:
        logger.error(f"Failed to pull account totals: {e}")

if __name__ == "__main__":
    debug_account_totals()
