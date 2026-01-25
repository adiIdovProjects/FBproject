"""
Migration: Add timezone column to users table
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import text
from backend.config.base_config import settings
from sqlalchemy import create_engine

def run_migration():
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'timezone'
        """))

        if result.fetchone():
            print("Column 'timezone' already exists in users table. Skipping.")
            return

        # Add the column
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'
        """))
        conn.commit()
        print("Successfully added 'timezone' column to users table.")

if __name__ == "__main__":
    run_migration()
