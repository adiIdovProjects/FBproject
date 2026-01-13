"""Run migration to add page_name column to user_ad_account table"""
from sqlalchemy import create_engine, text
from backend.config.base_config import settings

# Create database engine
engine = create_engine(settings.DATABASE_URL)

# Run migration
with engine.connect() as conn:
    conn.execute(text('ALTER TABLE user_ad_account ADD COLUMN IF NOT EXISTS page_name VARCHAR(255)'))
    conn.commit()
    print('Migration completed successfully: Added page_name column to user_ad_account')
