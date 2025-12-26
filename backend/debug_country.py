import os
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from extractors.fb_api import FacebookExtractor
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("debug_country")

load_dotenv()

def debug_country():
    extractor = FacebookExtractor()
    if not extractor.initialize():
        logger.error("Failed to initialize extractor")
        return

    yesterday = (datetime.now() - timedelta(days=1)).date()
    # Or as suggested by user, yesterday's data
    start_date = yesterday
    end_date = yesterday

    logger.info(f"Testing account {os.getenv('FACEBOOK_AD_ACCOUNT_ID')} for country breakdown from {start_date} to {end_date}")

    # Test Country Breakdown
    df = extractor.get_breakdown_data(['country'], start_date, end_date)
    
    if df.empty:
        logger.warning("❌ Country breakdown returned EMPTY DataFrame")
    else:
        logger.info(f"✅ Country breakdown returned {len(df)} rows")
        print("\n--- SAMPLE DATA ---")
        print(df.head(10))
        
        if 'country' in df.columns:
            print("\n--- UNIQUE COUNTRIES ---")
            print(df['country'].unique())
        else:
            print("\n❌ 'country' column MISSING from results!")
            print("Columns found:", df.columns.tolist())

if __name__ == "__main__":
    debug_country()
