"""
backend/debug_dimension_details.py - Investigates raw API data for dimensions
"""

import os
import logging
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.adcreative import AdCreative
from facebook_business.adobjects.adsinsights import AdsInsights
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

def debug_dimensions():
    # Initialize API
    app_id = os.getenv('FACEBOOK_APP_ID')
    app_secret = os.getenv('FACEBOOK_APP_SECRET')
    access_token = os.getenv('FACEBOOK_ACCESS_TOKEN')
    account_id = os.getenv('FACEBOOK_AD_ACCOUNT_ID')
    
    if not all([app_id, app_secret, access_token, account_id]):
        logger.error("Missing environment variables")
        return

    FacebookAdsApi.init(app_id, app_secret, access_token)
    account = AdAccount(f'act_{account_id}')

    print("\n" + "="*50)
    print("1. INVESTIGATING PLACEMENT BREAKDOWN COVERAGE")
    print("="*50)
    
    params = {
        'level': 'account',
        'date_preset': 'last_30d',
        'breakdowns': ['publisher_platform', 'platform_position'],
    }
    fields = ['impressions', 'spend']
    
    try:
        insights = account.get_insights(fields=fields, params=params)
        print(f"Found {len(insights)} placement breakdown rows")
        for i, row in enumerate(insights[:10]):
            print(f"Row {i+1}: Platform: {row.get('publisher_platform')}, Position: {row.get('platform_position')}, Impressions: {row.get('impressions')}")
    except Exception as e:
        print(f"Error fetching placement insights: {e}")

    print("\n" + "="*50)
    print("2. INVESTIGATING ADSET TARGETING")
    print("="*50)
    
    adset_fields = ['id', 'name', 'targeting', 'status']
    try:
        adsets = account.get_ad_sets(fields=adset_fields, params={'limit': 3})
        for adset in adsets:
            print(f"AdSet: {adset.get('name')} (ID: {adset.get('id')})")
            print(f"Targeting: {adset.get('targeting')}")
            print("-" * 20)
    except Exception as e:
        print(f"Error fetching adsets: {e}")

    print("\n" + "="*50)
    print("3. INVESTIGATING CREATIVE VIDEO DETAILS")
    print("="*50)
    
    creative_fields = [
        'id', 'name', 'title', 'body', 'image_url', 
        'thumbnail_url', 'video_id', 'asset_feed_spec', 
        'object_story_spec', 'effective_object_story_id'
    ]
    try:
        # Try to find recent creatives
        creatives = account.get_ad_creatives(fields=creative_fields, params={'limit': 5})
        for creative in creatives:
            print(f"Creative: {creative.get('name')} (ID: {creative.get('id')})")
            print(f"Video ID: {creative.get('video_id')}")
            # Check for body/title in specific locations if missing
            if not creative.get('body') or not creative.get('title'):
                print("Checking object_story_spec for text content...")
                oss = creative.get('object_story_spec')
                if oss:
                    print(f"Object Story Spec: {oss}")
            print(f"Asset Feed Spec: {creative.get('asset_feed_spec')}")
            print("-" * 20)
    except Exception as e:
        print(f"Error fetching creatives: {e}")

    print("\n" + "="*50)
    print("4. INVESTIGATING COUNTRY CODES")
    print("="*50)
    
    country_params = {
        'level': 'account',
        'date_preset': 'last_30d',
        'breakdowns': ['country'],
    }
    try:
        country_insights = account.get_insights(fields=['impressions'], params=country_params)
        for i, row in enumerate(country_insights[:5]):
            print(f"Row {i+1}: Country: {row.get('country')}")
    except Exception as e:
        print(f"Error fetching country insights: {e}")

if __name__ == "__main__":
    debug_dimensions()
