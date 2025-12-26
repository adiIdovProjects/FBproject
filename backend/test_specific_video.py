import os
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.advideo import AdVideo
from dotenv import load_dotenv

load_dotenv()

def test_specific_video():
    app_id = os.getenv('FACEBOOK_APP_ID')
    app_secret = os.getenv('FACEBOOK_APP_SECRET')
    access_token = os.getenv('FACEBOOK_ACCESS_TOKEN')
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    
    video_id = "1655583895826235"
    print(f"Testing Video ID: {video_id}")
    
    try:
        video = AdVideo(video_id).api_get(fields=['id', 'source', 'length', 'name', 'video_url', 'duration'])
        print(f"Video data: {video.export_all_data()}")
    except Exception as e:
        print(f"Error fetching video {video_id}: {e}")

if __name__ == "__main__":
    test_specific_video()
