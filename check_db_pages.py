
import sys
import os

# Add the project root to the python path
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config.base_config import settings
from backend.models.user_schema import User, UserAdAccount

def check_db_pages():
    # Setup DB connection directly
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Get users with FB connected
        users = db.query(User).filter(User.fb_user_id.isnot(None)).all()
        print(f"Found {len(users)} users with Facebook ID.")
        
        for user in users:
            print(f"\nUser: {user.email} (ID: {user.id})")
            
            # Check linked ad accounts
            ad_accounts = user.ad_accounts
            print(f"  - Linked Ad Accounts: {len(ad_accounts)}")
            
            assigned_pages = 0
            for acc in ad_accounts:
                status = "✅ HAS PAGE" if acc.page_id else "❌ NO PAGE"
                print(f"    * [{acc.account_id}]: {status} (Page ID: {acc.page_id})")
                if acc.page_id:
                    assigned_pages += 1
            
            print(f"  > Summary: {assigned_pages}/{len(ad_accounts)} accounts have a Page ID linked.")

    finally:
        db.close()

if __name__ == "__main__":
    check_db_pages()
