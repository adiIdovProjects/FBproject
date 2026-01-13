
import sys
import os
import logging

# Add project root to path
sys.path.append(os.getcwd())

# Setup Logging to console
logging.basicConfig(level=logging.INFO)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config.base_config import settings
from backend.models.user_schema import User
from backend.api.services.ad_mutation_service import AdMutationService
from backend.api.schemas.mutations import AddCreativeRequest, SmartCreative
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adset import AdSet

def debug_full_mutation():
    # 1. Param Setup (From verified DB check)
    EMAIL = "adi_idov@hotmail.com"
    ACCOUNT_ID = "32624310" # act_ prefix handled by service usually
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
    service = AdMutationService(access_token=user.fb_access_token)
    
    # 3. Fetch a Valid AdSet ID
    print(f"Fetching AdSets for account {ACCOUNT_ID}...")
    try:
        FacebookAdsApi.init(settings.FACEBOOK_APP_ID, settings.FACEBOOK_APP_SECRET, user.fb_access_token)
        account = AdAccount(f"act_{ACCOUNT_ID}")
        adsets = account.get_ad_sets(fields=['id', 'name', 'status'], params={'limit': 1})
        
        if not adsets:
            print("❌ No AdSets found in this account! Cannot test adding creative to AdSet.")
            return
            
        target_adset = adsets[0]
        ADSET_ID = target_adset['id']
        print(f"✅ Found AdSet: {target_adset['name']} ({ADSET_ID})")
        
    except Exception as e:
        print(f"❌ Failed to fetch adsets: {e}")
        return

    # 4. Construct Request Object
    # Mimic the payload sent from frontend
    request_data = AddCreativeRequest(
        account_id=ACCOUNT_ID,
        page_id=PAGE_ID,
        campaign_id="0", # Not used in add_creative_to_adset but required by schema?
        # Actually checking schema:
        # class AddCreativeRequest(BaseModel):
        #     account_id: str
        #     page_id: str
        #     campaign_id: str
        #     adset_id: str
        #     creative: SmartCreative
        adset_id=ADSET_ID, 
        creative=SmartCreative(
            title=f"Debug Full {ADSET_ID[:5]}",
            body="This is a test body for full mutation debug",
            call_to_action="LEARN_MORE",
            link_url="https://google.com" # Generic Safe URL
        )
    )

    # 5. Execute Service Call
    print("\n🚀 Executing service.add_creative_to_adset()...")
    try:
        result = service.add_creative_to_adset(request_data)
        print("✅ SUCCESS!")
        print(result)
    except Exception as e:
        print("\n❌ SERVICE FAILURE:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_full_mutation()
