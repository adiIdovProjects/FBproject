
import os
from facebook_business.api import FacebookAdsApi
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import text
import json

load_dotenv()

def check_node_types():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    
    from utils.db_utils import get_db_engine
    engine = get_db_engine()
    
    with engine.connect() as conn:
        ads = conn.execute(text("SELECT ad_id FROM dim_ad WHERE ad_id != 0")).fetchall()
        ad_ids = [str(r[0]) for r in ads]
    
    print(f"Checking node types for {len(ad_ids)} IDs...")
    
    try:
        # metadata{type} returns the node type
        resp = FacebookAdsApi.get_default_api().call(
            'GET', 
            ['/'], 
            params={
                'ids': ','.join(ad_ids), 
                'fields': 'id,metadata{type}'
            }
        ).json()
        
        for aid, data in resp.items():
            ntype = data.get('metadata', {}).get('type')
            print(f"ID {aid}: Type = {ntype}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_node_types()
