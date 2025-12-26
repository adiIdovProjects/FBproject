
import os
import sys
import json
import logging
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adset import AdSet
from dotenv import load_dotenv

# Load env vars
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DebugAdSetTargeting")

def debug_adset_targeting():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    account_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
    
    if not all([app_id, app_secret, access_token, account_id]):
        logger.error("Missing credentials")
        return

    FacebookAdsApi.init(app_id, app_secret, access_token)
    account = AdAccount(f'act_{account_id}')
    
    logger.info("Fetching adsets to check detailed targeting...")
    
    try:
        adsets = account.get_ad_sets(fields=[
            AdSet.Field.id,
            AdSet.Field.name,
            AdSet.Field.targeting,
            'status'
        ], params={'limit': 50})
        
        for adset in adsets:
            name = adset.get('name')
            targeting = adset.get('targeting')
            logger.info(f"AdSet: {name} ({adset.get('id')})")
            
            if targeting:
                # Pretty print targeting for analysis
                # logger.info(f"  Targeting JSON: {json.dumps(targeting, indent=2)}")
                
                if 'custom_audiences' in targeting:
                    for ca in targeting['custom_audiences']:
                        logger.info(f"    Custom Audience: {ca.get('name')} (ID: {ca.get('id')})")
                
                if 'flexible_spec' in targeting:
                    for spec in targeting['flexible_spec']:
                        for field in ['interests', 'behaviors']:
                            if field in spec:
                                names = [i.get('name') for i in spec[field] if i.get('name')]
                                logger.info(f"    {field.title()}: {names}")
                
                if not any(k in targeting for k in ['custom_audiences', 'flexible_spec', 'geo_locations']):
                    logger.info("    Broad (No specific targeting found beyond basic geo)")
            else:
                logger.info("    No targeting data returned.")

    except Exception as e:
        logger.error(f"Failed to fetch adsets: {e}")

if __name__ == "__main__":
    debug_adset_targeting()
