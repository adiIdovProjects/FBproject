
import os
import sys
import logging
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.user import User
from facebook_business.adobjects.adaccount import AdAccount
from dotenv import load_dotenv

# Load env vars
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ListAccounts")

def list_accounts():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    
    if not all([app_id, app_secret, access_token]):
        logger.error("Missing credentials")
        return

    FacebookAdsApi.init(app_id, app_secret, access_token)
    
    try:
        me = User(fbid='me')
        accounts = me.get_ad_accounts(fields=['id', 'name'])
        
        logger.info("Accessible Ad Accounts:")
        for account in accounts:
            logger.info(f"  - {account['id']}: {account['name']}")
            
        current_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
        logger.info(f"Current Account ID in .env: {current_id}")
        
    except Exception as e:
        logger.error(f"Failed to list accounts: {e}")

if __name__ == "__main__":
    list_accounts()
