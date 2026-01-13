import logging
import time
import pandas as pd
from datetime import date, timedelta
from backend.extractors.fb_api import FacebookExtractor
from backend.utils.logging_utils import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

def test_optimized_extraction():
    logger.info("🚀 Starting Optimization Verification...")
    
    extractor = FacebookExtractor()
    if not extractor.initialize():
        logger.error("Failed to init")
        return

    # 1. Fetch Account Info
    info = extractor.get_account_info()
    logger.info(f"Account: {info}")

    # 2. Fetch Core Data (Larger range for test)
    end_date = date.today()
    start_date = end_date - timedelta(days=45)
    
    start_time = time.time()
    df_core = extractor.get_core_data(start_date, end_date)
    duration_core = time.time() - start_time
    logger.info(f"✅ Core Data: {len(df_core)} rows in {duration_core:.2f}s")

    if not df_core.empty:
        # 3. Fetch Metadata (The main optimization target)
        start_time = time.time()
        df_meta = extractor.get_metadata(df_core)
        duration_meta = time.time() - start_time
        logger.info(f"✅ Metadata: {len(df_meta)} rows in {duration_meta:.2f}s")
        
        # 4. Fetch Creatives (The secondary target)
        if 'creative_id' in df_meta.columns:
             creative_ids = df_meta['creative_id'].unique().tolist()
             start_time = time.time()
             df_creatives = extractor.get_creative_details(creative_ids)
             duration_creative = time.time() - start_time
             logger.info(f"✅ Creatives: {len(df_creatives)} rows in {duration_creative:.2f}s")
        else:
            logger.warning("No creative IDs found in metadata")

    logger.info("🎉 Verification Complete")

if __name__ == "__main__":
    test_optimized_extraction()
