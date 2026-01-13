
import sys
import os
import json
from datetime import datetime

# Add project root to path
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config.base_config import settings
from backend.models.user_schema import User
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adcreative import AdCreative
from facebook_business.exceptions import FacebookRequestError

def debug_create_creative():
    # 1. Get User Token
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    user = db.query(User).filter(User.email == "adi_idov@hotmail.com").first()
    if not user:
        print("User not found")
        return

    access_token = user.fb_access_token
    print(f"User found. Token prefix: {access_token[:10]}...")
    
    # 2. Initialize API
    FacebookAdsApi.init(settings.FACEBOOK_APP_ID, settings.FACEBOOK_APP_SECRET, access_token)
    
    # 3. Target Account (The one WITH a page)
    # From check_db_pages: 32624310 has page 255564241759254
    ACCOUNT_ID = "act_32624310"
    PAGE_ID = "255564241759254"
    
    print(f"Testing Creative Creation on Account {ACCOUNT_ID} with Page {PAGE_ID}")
    
    account = AdAccount(ACCOUNT_ID)
    
    # 4. Build Params (Simple Link Ad)
    params = {
        AdCreative.Field.name: f"Debug Creative {datetime.now().strftime('%H:%M:%S')}",
        AdCreative.Field.object_story_spec: {
            "page_id": PAGE_ID,
            "link_data": {
                "message": "Debug Creative Body Text",
                "link": f"https://facebook.com/{PAGE_ID}",
                "name": "Debug Creative Headline",
                "call_to_action": {"type": "LEARN_MORE"}
            }
        }
    }
    
    try:
        print("Sending request...")
        creative = account.create_ad_creative(params=params)
        print("✅ SUCCESS! Creative Created.")
        print(f"Creative ID: {creative.get_id()}")
    except FacebookRequestError as e:
        print("\n❌ FAILED to create Ad Creative:")
        print(f"  Message: {e.api_error_message()}")
        print(f"  Type: {e.api_error_type()}")
        print(f"  Code: {e.api_error_code()}")
        print(f"  Subcode: {e.api_error_subcode()}")
        if e.api_error_user_msg():
             print(f"  User Msg: {e.api_error_user_msg()}")
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")

if __name__ == "__main__":
    debug_create_creative()
