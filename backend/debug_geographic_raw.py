import os
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from extractors.fb_api import FacebookExtractor
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("debug_geographic_raw")

load_dotenv()

def debug_geographic():
    extractor = FacebookExtractor()
    if not extractor.initialize():
        logger.error("Failed to initialize extractor")
        return

    # Let's check the last 30 days
    end_date = (datetime.now() - timedelta(days=1)).date()
    start_date = end_date - timedelta(days=30)

    logger.info(f"Testing account {os.getenv('FACEBOOK_AD_ACCOUNT_ID')} for geographic breakdown from {start_date} to {end_date}")

    # Test Geographic Breakdown
    df = extractor.get_breakdown_data(['country'], start_date, end_date)
    
    if df.empty:
        logger.warning("❌ Geographic breakdown returned EMPTY DataFrame")
    else:
        logger.info(f"✅ Geographic breakdown returned {len(df)} rows")
        print("\n--- SAMPLE DATA ---")
        print(df.head(20))
        
        print("\n--- UNIQUE COUNTRIES IN RAW DATA ---")
        if 'country' in df.columns:
            print(df['country'].value_counts())
        else:
            print("❌ 'country' column MISSING from results!")
            print("Columns found:", df.columns.tolist())
            
        print("\n--- SPEND BY RAW COUNTRY ---")
        if 'country' in df.columns and 'spend' in df.columns:
            df['spend'] = pd.to_numeric(df['spend'], errors='coerce').fillna(0)
            print(df.groupby('country')['spend'].sum().sort_values(ascending=False))

if __name__ == "__main__":
    debug_geographic()
