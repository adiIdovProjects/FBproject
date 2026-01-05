"""Simple script to add meta_user directly"""
import sys
sys.path.insert(0, '.')

from backend.utils.db_utils import get_db_engine
from sqlalchemy import text

engine = get_db_engine()

with engine.connect() as conn:
    # Check existing users
    result = conn.execute(text("SELECT id, email, full_name FROM users"))
    users = result.fetchall()

    print("=" * 80)
    print(f"Existing users: {len(users)}")
    for user in users:
        print(f"  ID: {user[0]} | Email: {user[1]} | Name: {user[2]}")

    # Check if meta_user exists
    result = conn.execute(text("SELECT id FROM users WHERE email = 'meta_user@admin.com'"))
    existing = result.fetchone()

    if existing:
        print("\n✓ meta_user already exists (ID: {})".format(existing[0]))
    else:
        print("\n✗ Creating meta_user...")

        # Insert meta_user
        from backend.api.utils.security import get_password_hash
        from datetime import datetime, timedelta
        import uuid

        password_hash = get_password_hash("admin123")
        far_future = datetime.now() + timedelta(days=36500)
        fb_id = f"admin_{uuid.uuid4().hex[:8]}"

        conn.execute(text("""
            INSERT INTO users (email, full_name, password_hash, fb_user_id, fb_access_token, fb_token_expires_at)
            VALUES (:email, :name, :password, :fb_id, :token, :expires)
        """), {
            "email": "meta_user@admin.com",
            "name": "Meta Admin User",
            "password": password_hash,
            "fb_id": fb_id,
            "token": "admin_token",
            "expires": far_future
        })
        conn.commit()

        print("✓ Successfully created meta_user!")
        print("  Email: meta_user@admin.com")
        print("  Password: admin123")

    print("=" * 80)
