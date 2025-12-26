
import os
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.ad import Ad
from dotenv import load_dotenv

load_dotenv()

def debug_real_ads():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    account_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    account = AdAccount(f'act_{account_id}')
    
    print("Fetching one ad...")
    ads = account.get_ads(fields=[Ad.Field.id, Ad.Field.creative], params={'limit': 1})
    
    for ad in ads:
        print(f"Ad: {ad}")
        creative = ad.get('creative')
        print(f"Creative object: {creative}")
        print(f"Creative type: {type(creative)}")
        
        # Test extraction methods
        print(f"hasattr(creative, 'get'): {hasattr(creative, 'get')}")
        try:
            print(f"creative.get('id'): {creative.get('id')}")
        except Exception as e:
            print(f"creative.get('id') failed: {e}")
            
        try:
            print(f"creative['id']: {creative['id']}")
        except Exception as e:
            print(f"creative['id'] failed: {e}")

        try:
            print(f"getattr(creative, 'id'): {getattr(creative, 'id')}")
        except Exception as e:
            print(f"getattr(creative, 'id') failed: {e}")

        # Check dict(ad)
        ad_dict = dict(ad)
        print(f"ad_dict['creative'] type: {type(ad_dict.get('creative'))}")

if __name__ == "__main__":
    debug_real_ads()
