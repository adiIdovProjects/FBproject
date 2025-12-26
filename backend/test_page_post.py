import os
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.pagepost import PagePost
from dotenv import load_dotenv
import json

load_dotenv()

def test_page_post():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    
    # Use an EffectiveObjectStoryId from previous run
    post_id = '255564241759254_1384709976690963' 
    
    print(f"\n--- Querying Page Post: {post_id} ---")
    try:
        post = PagePost(post_id)
        # Try fetching all fields that might have video info
        fields = ['id', 'message', 'object_type', 'object_id', 'properties', 'full_picture']
        data = post.api_get(fields=fields).export_all_data()
        print(json.dumps(data, indent=2))
        
    except Exception as e:
        print(f"Error querying Page Post: {e}")

if __name__ == "__main__":
    test_page_post()
