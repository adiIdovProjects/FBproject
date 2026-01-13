import os
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adcreative import AdCreative
from dotenv import load_dotenv
import json

load_dotenv()

def inspect_creatives():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    
    # IDs from previous run
    creative_ids = ['1300101114996529', '870707068766960', '1317562520151481'] 
    
    fields = [
        'id', 'name', 'title', 'body', 'image_url', 'thumbnail_url',
        'video_id', 'asset_feed_spec', 'object_story_spec', 
        'effective_object_story_id'
    ]
    
    for cid in creative_ids:
        print(f"\n--- Inspecting Creative: {cid} ---")
        try:
            creative = AdCreative(cid)
            data = creative.api_get(fields=fields).export_all_data()
            print(json.dumps(data, indent=2))
            
            if 'asset_feed_spec' in data:
                af = data['asset_feed_spec']
                print(f"--- Full asset_feed_spec for {cid} ---")
                print(json.dumps(af, indent=2))
                if 'videos' in af:
                    print(f"  FOUND Nested Video in asset_feed_spec: {af['videos']}")
            
            if 'object_story_spec' in data:
                oss = data['object_story_spec']
                if 'video_data' in oss:
                    print(f"  FOUND Nested Video in object_story_spec.video_data: {oss['video_data']}")
                
        except Exception as e:
            print(f"Error inspecting {cid}: {e}")

if __name__ == "__main__":
    inspect_creatives()
