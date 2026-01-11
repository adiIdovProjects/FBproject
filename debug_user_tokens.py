import sys
import os

# Add the project root to the python path
sys.path.append(os.getcwd())

from backend.api.dependencies import get_db
from backend.models.user_schema import User
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config.base_config import settings

def check_tokens():
    # Setup DB connection directly
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        users = db.query(User).filter(User.google_id.isnot(None)).all()
        print(f"Found {len(users)} users with Google ID.")
        for user in users:
            print(f"User: {user.email}")
            print(f"  - Google ID: {user.google_id}")
            print(f"  - Access Token Present: {bool(user.google_access_token)}")
            print(f"  - Refresh Token Present: {bool(user.google_refresh_token)}")
            if user.google_refresh_token:
                print(f"  - Refresh Token Length: {len(user.google_refresh_token)}")
            
            if not user.google_refresh_token:
                 print("  > WARNING: No refresh token. Token refresh will fail.")
    finally:
        db.close()

if __name__ == "__main__":
    check_tokens()
