#!/usr/bin/env python3
"""
Quick script to check existing users in the database
"""
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_path))

from backend.utils.db_utils import get_db_engine
from sqlalchemy.orm import sessionmaker
from backend.models.user_schema import User

# Create session
engine = get_db_engine()
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    users = db.query(User).all()

    if not users:
        print("No users found in database")
    else:
        print(f"Found {len(users)} user(s):")
        print("-" * 80)
        for user in users:
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Full Name: {user.full_name}")
            print(f"FB User ID: {user.fb_user_id}")
            print(f"Has Password: {'Yes' if user.password_hash else 'No'}")
            print(f"Created: {user.created_at}")
            print("-" * 80)
finally:
    db.close()
