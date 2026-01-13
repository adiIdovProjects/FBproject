import os
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from extractors.fb_api import FacebookExtractor
import logging
from utils.mapping_utils import map_country_code

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("debug_country_details")

load_dotenv()

def debug_country_details():
    extractor = FacebookExtractor()
    if not extractor.initialize():
        logger.error("Failed to initialize extractor")
        return

    # Look back 21 days to cover the issue period
    end_date = (datetime.now() - timedelta(days=1)).date()
    start_date = end_date - timedelta(days=28)

    logger.info(f"Extracting country details from {start_date} to {end_date}")

    # 1. Get Core Data (Total Spend)
    df_core = extractor.get_core_data(start_date, end_date)
    if not df_core.empty:
        df_core['spend'] = pd.to_numeric(df_core['spend'], errors='coerce').fillna(0)
        total_core_spend = df_core['spend'].sum()
        logger.info(f"Total Core Spend: ${total_core_spend:.2f}")
    
    # 2. Get Geographic Breakdown
    df_geo = extractor.get_breakdown_data(['country'], start_date, end_date)
    
    if df_geo.empty:
        logger.warning("❌ Geographic breakdown returned EMPTY")
        return

    df_geo['spend'] = pd.to_numeric(df_geo['spend'], errors='coerce').fillna(0)
    total_geo_spend = df_geo['spend'].sum()
    logger.info(f"Total Geo Spend: ${total_geo_spend:.2f}")
    
    print("\n--- RAW COUNTRY CODES FOUND ---")
    codes = sorted([str(c) for c in df_geo['country'].unique().tolist() if pd.notna(c)])
    print(codes)
    
    print("\n--- MAPPING TEST ---")
    for code in codes:
        mapped = map_country_code(code)
        print(f"Code: {code} -> Name: {mapped}")

    print("\n--- GEOGRAPHIC SPEND BY DATE ---")
    geo_daily = df_geo.groupby(['date_start', 'country'])['spend'].sum().reset_index()
    print(geo_daily.sort_values(['date_start', 'spend'], ascending=[False, False]))

    # 3. Check for specific problematic dates
    print("\n--- COMPARISON BY DATE (CORE vs GEO) ---")
    core_daily = df_core.groupby('date_start')['spend'].sum()
    geo_daily_total = df_geo.groupby('date_start')['spend'].sum()
    
    comp = pd.DataFrame({'core': core_daily, 'geo': geo_daily_total})
    comp['diff'] = comp['core'] - comp['geo']
    print(comp)

if __name__ == "__main__":
    debug_country_details()
