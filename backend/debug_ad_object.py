
import os
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.ad import Ad
from dotenv import load_dotenv
import json

load_dotenv()

def debug_specific_ad():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    
    ad_id = '23852693825510103'
    ad = Ad(ad_id)
    
    print(f"Fetching Ad {ad_id}...")
    fields = [Ad.Field.id, Ad.Field.name, Ad.Field.creative, Ad.Field.adset_id]
    
    try:
        ad.remote_read(fields=fields)
        print("Ad data (remote_read):")
        print(ad)
        
        print("\nExported data:")
        exported = ad.export_all_data()
        print(json.dumps(exported, indent=2))
        
        print(f"\nCreative in exported: {exported.get('creative')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_specific_ad()
