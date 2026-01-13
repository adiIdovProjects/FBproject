"""
Script to check existing users and add meta_user as admin if needed
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

from dotenv import load_dotenv
from datetime import datetime, timedelta
import uuid

# Load environment
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

from backend.utils.db_utils import get_db_engine
from sqlalchemy.orm import sessionmaker
from backend.models.user_schema import User
from backend.api.utils.security import get_password_hash

# Create session
engine = get_db_engine()
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # Check existing users
    users = db.query(User).all()

    print("=" * 80)
    print(f"EXISTING USERS: {len(users)} found")
    print("=" * 80)

    for user in users:
        print(f"ID: {user.id} | Email: {user.email} | Name: {user.full_name}")

    # Check if meta_user exists
    meta_user = db.query(User).filter(User.email == "meta_user@admin.com").first()

    if meta_user:
        print("\n✓ meta_user already exists!")
        print(f"  ID: {meta_user.id}")
        print(f"  Email: {meta_user.email}")
        print(f"  Name: {meta_user.full_name}")
    else:
        print("\n✗ meta_user does not exist. Creating now...")

        # Create meta_user as admin
        password_hash = get_password_hash("admin123")  # Change this to a secure password
        far_future = datetime.now() + timedelta(days=36500)  # 100 years

        new_user = User(
            email="meta_user@admin.com",
            full_name="Meta Admin User",
            password_hash=password_hash,
            fb_user_id=f"admin_{uuid.uuid4().hex[:8]}",
            fb_access_token="admin_token",
            fb_token_expires_at=far_future
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        print("\n✓ Successfully created meta_user!")
        print(f"  ID: {new_user.id}")
        print(f"  Email: {new_user.email}")
        print(f"  Password: admin123")
        print(f"  Name: {new_user.full_name}")

    print("\n" + "=" * 80)

finally:
    db.close()
