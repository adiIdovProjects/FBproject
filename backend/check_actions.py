
import sys
import os
import logging
import pandas as pd
from sqlalchemy import text

# Add project root to path
sys.path.append(os.getcwd())

try:
    from utils.db_utils import get_db_engine
except ImportError:
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from utils.db_utils import get_db_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CheckActions")

def main():
    try:
        engine = get_db_engine()
        
        query = text("SELECT * FROM dim_action_type LIMIT 20;")
        
        with engine.connect() as conn:
            result = conn.execute(query)
            rows = result.fetchall()
            
            logger.info(f"Found {len(rows)} rows in dim_action_type:")
            for row in rows:
                logger.info(row)
                
            if len(rows) > 1:
                logger.info("✅ SUCCESS: dim_action_type is populated with more than just the default row.")
            else:
                logger.warning("⚠️ WARNING: dim_action_type still only has 1 row (likely default).")
                
    except Exception as e:
        logger.error(f"Error checking DB: {e}")

if __name__ == "__main__":
    main()
