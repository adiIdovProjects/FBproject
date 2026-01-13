
import sys
import os
import logging

# Add project root to path
sys.path.append(os.getcwd())

# Setup Logging
logging.basicConfig(level=logging.INFO)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config.base_config import settings
from backend.models.user_schema import User
from facebook_business.api import FacebookAdsApi

def debug_lead_forms():
    # 1. Param Setup
    EMAIL = "adi_idov@hotmail.com"
    PAGE_ID = "255564241759254"

    # 2. Get User & Token
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    user = db.query(User).filter(User.email == EMAIL).first()
    if not user:
        print("❌ User not found")
        return

    print(f"User: {user.email}")
    
    # 3. Test API Call
    print(f"Fetching Lead Forms for Page {PAGE_ID}...")
    try:
        # Manually init API with this user's token
        api = FacebookAdsApi.init(settings.FACEBOOK_APP_ID, settings.FACEBOOK_APP_SECRET, user.fb_access_token)
        
        # Raw call exactly like the service does
        response = api.call('GET', (PAGE_ID, 'leadgen_forms'), {'fields': 'id,name,status,created_time'})
        data = response.json()
        
        print(f"✅ Success! Response keys: {data.keys()}")
        if 'data' in data:
            print(f"Found {len(data['data'])} forms.")
            for form in data['data']:
                print(f" - {form['name']} ({form['status']}) [{form['id']}]")
        else:
            print("⚠️ No 'data' key in response.")
            print(data)

    except Exception as e:
        print("\n❌ FAILURE:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_lead_forms()
