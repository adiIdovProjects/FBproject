"""Create test user with password"""
from sqlalchemy import create_engine, text
from backend.config.base_config import Settings
from backend.api.utils.security import get_password_hash

settings = Settings()

def create_test_user():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        # Check if user exists
        check = conn.execute(text("SELECT id FROM users WHERE email = 'test@test.com'"))
        existing = check.fetchone()

        if existing:
            # Update password
            hashed = get_password_hash("test123")
            conn.execute(
                text("UPDATE users SET hashed_password = :pwd WHERE email = 'test@test.com'"),
                {"pwd": hashed}
            )
            conn.commit()
            print("Updated test user password")
        else:
            # Create user
            hashed = get_password_hash("test123")
            conn.execute(
                text("""
                    INSERT INTO users (email, full_name, hashed_password)
                    VALUES ('test@test.com', 'Test User', :pwd)
                """),
                {"pwd": hashed}
            )
            conn.commit()
            print("Created test user")

        print("\nTest credentials:")
        print("  Email: test@test.com")
        print("  Password: test123")

if __name__ == "__main__":
    create_test_user()
