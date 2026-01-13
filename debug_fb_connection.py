
import sys
import os
import requests
from typing import Dict, Any

# Add the project root to the python path
sys.path.append(os.getcwd())

from backend.models.user_schema import User
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config.base_config import settings
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.user import User as FBUser


from facebook_business.adobjects.page import Page

def check_fb_connection():
    # Setup DB connection directly
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Get users with FB connected
        users = db.query(User).filter(User.fb_user_id.isnot(None)).all()
        print(f"Found {len(users)} users with Facebook ID.")
        
        for user in users:
            print(f"\nUser: {user.email}")
            print(f"  - FB User ID: {user.fb_user_id}")
            print(f"  - AT Present: {bool(user.fb_access_token)}")
            
            if not user.fb_access_token:
                print("  > No access token, skipping.")
                continue

            # 1. Check Permissions
            print("  > Checking Permissions...")
            try:
                url = f"https://graph.facebook.com/v18.0/{user.fb_user_id}/permissions"
                params = {"access_token": user.fb_access_token}
                resp = requests.get(url, params=params)
                if resp.status_code == 200:
                    perms = resp.json().get('data', [])
                    print("    GRANTED PERMISSIONS:")
                    for p in perms:
                        if p.get('status') == 'granted':
                            print(f"      - {p.get('permission')}")
                else:
                    print(f"    ! Failed to get permissions: {resp.text}")
            except Exception as e:
                print(f"    ! Error checking permissions: {e}")

            FacebookAdsApi.init(access_token=user.fb_access_token)
            me = FBUser(fbid='me')

            # 2. Check Pages Access (User level)
            print("  > Checking User Pages (me/accounts)...")
            try:
                # This requires pages_show_list usually
                pages = me.get_accounts(fields=['name', 'id']) 
                print(f"    Found {len(pages)} pages.")
                for p in pages:
                    print(f"    - {p['name']} ({p['id']})")
            except Exception as e:
                print(f"    ! Failed to list pages: {e}")

            # 3. Check Ad Accounts
            print("  > Checking Managed Ad Accounts...")
            try:
                accounts = me.get_ad_accounts(fields=['account_id', 'name'])
                print(f"    Found {len(accounts)} ad accounts.")
                
                if len(accounts) > 0:
                    # Inspect one account
                    acc = accounts[0]
                    acc_id = acc['account_id']
                    print(f"    Inspecting Ad Account: {acc['name']} ({acc_id})")
                    act = AdAccount(f"act_{acc_id}")
                    
                    # Check available methods on AdAccount
                    # methods = [m for m in dir(act) if 'page' in m]
                    # print(f"    Available 'page' methods on AdAccount: {methods}")

                    # Try specific edge if suspected
                    try:
                        # 'promote_pages' is a common edge
                        promoted = act.get_promote_pages(fields=['name', 'id'])
                        print(f"    get_promote_pages results ({len(promoted)}):")
                        for p in promoted:
                            print(f"      - {p['name']} ({p['id']})")
                    except Exception as e:
                        print(f"      ! get_promote_pages failed: {e}")

            except Exception as e:
                print(f"    ! Error checking accounts: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    check_fb_connection()
