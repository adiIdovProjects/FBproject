import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config.base_config import settings

def test_db():
    print(f"Testing connection to: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}")
    print(f"User: {settings.POSTGRES_USER}")
    print(f"DB: {settings.POSTGRES_DB}")
    
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            print("SUCCESS: Database connection successful!")
    except Exception as e:
        print(f"ERROR: Database connection failed: {e}")

if __name__ == "__main__":
    test_db()
