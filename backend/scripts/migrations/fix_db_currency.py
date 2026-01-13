
import logging
from sqlalchemy import text
from backend.api.dependencies import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FixCurrency")

def fix_currency():
    db = SessionLocal()
    try:
        # Check current state
        query_check = text("SELECT account_id, account_name, currency FROM dim_account WHERE currency = 'BRL'")
        results = db.execute(query_check).fetchall()
        
        if not results:
            logger.info("No accounts with BRL currency found.")
        else:
            logger.info(f"Found {len(results)} accounts with BRL. Updating to USD...")
            
            # Update ID 0
            update_query = text("UPDATE dim_account SET currency = 'USD' WHERE currency = 'BRL'")
            res = db.execute(update_query)
            db.commit()
            logger.info(f"Successfully updated {res.rowcount} records to USD.")
            
        # Verify
        query_verify = text("SELECT account_id, account_name, currency FROM dim_account")
        final_results = db.execute(query_verify).fetchall()
        logger.info("Current dim_account state:")
        for row in final_results:
            logger.info(f"  - ID: {row.account_id}, Name: {row.account_name}, Currency: {row.currency}")
            
    except Exception as e:
        logger.error(f"Failed to fix currency: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_currency()
