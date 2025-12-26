
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
logger = logging.getLogger("CheckDims")

def main():
    try:
        engine = get_db_engine()
        
        dims = [
            'dim_account', 'dim_campaign', 'dim_adset', 'dim_ad', 
            'dim_creative', 'dim_action_type', 'dim_placement', 
            'dim_country', 'dim_date'
        ]
        
        with engine.connect() as conn:
            for dim in dims:
                try:
                    query = text(f"SELECT COUNT(*) FROM {dim};")
                    count = conn.execute(query).scalar()
                    
                    if count > 1: # More than just the unknown member
                        logger.info(f"✅ {dim}: {count} rows")
                        # Show a few samples
                        sample_query = text(f"SELECT * FROM {dim} WHERE 1=1 LIMIT 3;")
                        samples = conn.execute(sample_query).fetchall()
                        for s in samples:
                            logger.info(f"   Sample: {s}")
                    else:
                        logger.warning(f"⚠️ {dim}: {count} rows (empty or only default)")
                except Exception as e:
                    logger.error(f"❌ Error checking {dim}: {e}")
                
    except Exception as e:
        logger.error(f"Error checking DB: {e}")

if __name__ == "__main__":
    main()
