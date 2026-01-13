
import logging
import sys
import os

# Ensure backend module is found
sys.path.append(os.getcwd())

from sqlalchemy import text
from backend.utils.db_utils import get_db_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_db():
    engine = get_db_engine()
    with engine.connect() as conn:
        try:
            logger.info("Checking if is_carousel column exists in dim_creative...")
            # Check if column exists (Postgres/SQLite compatible-ish way or just try catch)
            # Simple way: Select it, if fails, add it.
            try:
                conn.execute(text("SELECT is_carousel FROM dim_creative LIMIT 1"))
                logger.info("Column is_carousel already exists.")
            except Exception:
                logger.info("Column is_carousel does not exist. Adding it...")
                conn.rollback() # Reset transaction
                conn.execute(text("ALTER TABLE dim_creative ADD COLUMN is_carousel BOOLEAN DEFAULT FALSE"))
                conn.commit()
                logger.info("Successfully added is_carousel column.")
                
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    migrate_db()
