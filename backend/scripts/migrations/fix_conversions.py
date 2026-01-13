
import logging
from sqlalchemy import text
from backend.api.dependencies import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FixConversions")

def fix_conversions():
    db = SessionLocal()
    try:
        # 1. Update lead_website to NOT be a conversion
        logger.info("Updating 'lead_website' to is_conversion = FALSE...")
        update_query = text("UPDATE dim_action_type SET is_conversion = FALSE WHERE action_type = 'lead_website'")
        res = db.execute(update_query)
        db.commit()
        logger.info(f"Successfully updated {res.rowcount} records.")

        # 2. Verify
        logger.info("\n--- Current Conversion Action Types ---")
        query_verify = text("SELECT action_type, is_conversion FROM dim_action_type WHERE is_conversion = TRUE")
        results = db.execute(query_verify).fetchall()
        for row in results:
            logger.info(f"  - {row.action_type}: {row.is_conversion}")

    except Exception as e:
        logger.error(f"Failed to fix conversions: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_conversions()
