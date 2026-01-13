import os
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adcreative import AdCreative
from dotenv import load_dotenv

load_dotenv()

def test_video_extract():
    app_id = os.getenv('FACEBOOK_APP_ID')
    app_secret = os.getenv('FACEBOOK_APP_SECRET')
    access_token = os.getenv('FACEBOOK_ACCESS_TOKEN')
    account_id = os.getenv('FACEBOOK_AD_ACCOUNT_ID')
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    account = AdAccount(f'act_{account_id}')
    
    fields = ['id', 'name', 'video_id', 'video_data', 'asset_feed_spec']
    creatives = account.get_ad_creatives(fields=fields, params={'limit': 10})
    
    for c in creatives:
        data = c.export_all_data()
        print(f"\nCreative ID: {data.get('id')}")
        print(f"Video ID: {data.get('video_id')}")
        vd = data.get('video_data')
        if vd:
            print(f"Video Data: {vd}")
        af = data.get('asset_feed_spec')
        if af:
            print(f"Asset Feed Spec: {af}")

if __name__ == "__main__":
    test_video_extract()
