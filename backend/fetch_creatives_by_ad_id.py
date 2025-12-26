
import os
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.ad import Ad
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import text
import json

load_dotenv()

def fetch_by_ids():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    
    from utils.db_utils import get_db_engine
    engine = get_db_engine()
    
    with engine.connect() as conn:
        ads = conn.execute(text("SELECT ad_id FROM dim_ad WHERE ad_id != 0")).fetchall()
        ad_ids = [str(r[0]) for r in ads]
    
    print(f"Found {len(ad_ids)} ads in DB. Fetching metadata for them...")
    
    if not ad_ids:
        print("No ads found in DB.")
        return

    # Use batch/ids endpoint if possible, but for 12 ads we can loop or use a single request if we use raw API
    # The simplest is to use FacebookAdsApi.get_instance().call
    
    try:
        results = FacebookAdsApi.get_instance().call(
            'GET',
            ['/'],
            params={
                'ids': ','.join(ad_ids),
                'fields': 'id,name,creative'
            }
        ).json()
        
        print(f"Fetched {len(results)} results.")
        for aid, data in results.items():
            print(f"Ad {aid}:")
            creative = data.get('creative')
            print(f"  Creative: {creative}")
            if creative:
                print(f"  Creative ID: {creative.get('id')}")
    except Exception as e:
        print(f"Error fetching by IDs: {e}")

if __name__ == "__main__":
    fetch_by_ids()
