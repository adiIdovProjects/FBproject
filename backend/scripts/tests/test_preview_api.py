import os
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adcreative import AdCreative
from dotenv import load_dotenv
import json

load_dotenv()

def test_preview():
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    
    # Use a video creative ID
    creative_id = '1300101114996529' 
    
    print(f"\n--- Fetching Preview for Creative: {creative_id} ---")
    try:
        creative = AdCreative(creative_id)
        # Try multiple formats
        formats = ['DESKTOP_FEED_STANDARD', 'INSTAGRAM_STANDARD']
        for fmt in formats:
            print(f"\nFormat: {fmt}")
            previews = creative.get_previews(params={'ad_format': fmt})
            for p in previews:
                html = p.get('body')
                print(f"HTML Preview (first 500 chars):\n{html[:500]}...")
                if 'video' in html.lower() or '.mp4' in html.lower() or 'src=' in html.lower():
                    print("Potential video reference found in HTML!")
                    # Extract src
                    import re
                    srcs = re.findall(r'src="(.*?)"', html)
                    for s in srcs:
                        if '.mp4' in s or 'video' in s:
                            print(f"Found SRC: {s}")
                
    except Exception as e:
        print(f"Error fetching preview: {e}")

if __name__ == "__main__":
    test_preview()
