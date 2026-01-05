"""
Migration: Add dim_insight_history table for proactive AI insights
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text
from config.base_config import Settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Add dim_insight_history table to database"""
    settings = Settings()
    engine = create_engine(settings.DATABASE_URL)

    # Create table SQL
    create_table_sql = text("""
        CREATE TABLE IF NOT EXISTS dim_insight_history (
            insight_id SERIAL PRIMARY KEY,
            account_id BIGINT REFERENCES dim_account(account_id),
            generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            insight_type VARCHAR(50) NOT NULL,
            priority VARCHAR(20) NOT NULL,
            category VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            data_json TEXT,
            is_read BOOLEAN NOT NULL DEFAULT FALSE
        );
    """)

    # Create indexes
    create_indexes_sql = [
        text("CREATE INDEX IF NOT EXISTS idx_insight_account_generated ON dim_insight_history(account_id, generated_at);"),
        text("CREATE INDEX IF NOT EXISTS idx_insight_priority ON dim_insight_history(priority);"),
        text("CREATE INDEX IF NOT EXISTS idx_insight_type ON dim_insight_history(insight_type);"),
        text("CREATE INDEX IF NOT EXISTS idx_insight_read ON dim_insight_history(is_read);")
    ]

    try:
        with engine.connect() as conn:
            # Create table
            logger.info("Creating dim_insight_history table...")
            conn.execute(create_table_sql)
            conn.commit()
            logger.info("✅ Table created successfully")

            # Create indexes
            logger.info("Creating indexes...")
            for idx_sql in create_indexes_sql:
                conn.execute(idx_sql)
                conn.commit()
            logger.info("✅ Indexes created successfully")

            logger.info("✅ Migration completed successfully!")

    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        raise
    finally:
        engine.dispose()

if __name__ == "__main__":
    migrate()
