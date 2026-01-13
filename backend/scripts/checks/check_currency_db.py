
import logging
from sqlalchemy import text
from backend.api.dependencies import get_db
from sqlalchemy.orm import Session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CheckCurrency")

def check_currency():
    from backend.api.dependencies import SessionLocal
    
    db = SessionLocal()
    try:
        query = text("SELECT account_id, account_name, currency FROM dim_account")
        results = db.execute(query).fetchall()
        
        if not results:
            logger.info("No accounts found in dim_account table.")
            return
            
        logger.info("Accounts in dim_account:")
        for row in results:
            logger.info(f"  - ID: {row.account_id}, Name: {row.account_name}, Currency: {row.currency}")
            
    except Exception as e:
        logger.error(f"Failed to check currency: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_currency()
