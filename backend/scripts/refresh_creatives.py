
import logging
import sys
import os
from datetime import date, timedelta
import pandas as pd

# Ensure backend module is found
sys.path.append(os.getcwd())

from backend.utils.db_utils import get_db_engine
from backend.extractors.fb_api import FacebookExtractor
from backend.transformers.core_transformer import CoreTransformer
from backend.config.settings import BASE_FIELDS_TO_PULL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def force_refresh_creatives():
    logger.info("Starting force refresh of creative data...")
    
    # Initialize Extractor
    extractor = FacebookExtractor()
    if not extractor.initialize():
        logger.error("Failed to initialize Facebook Extractor")
        return

    # Fetch last 30 days of data to get recent creatives
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    
    logger.info(f"Fetching core data from {start_date} to {end_date}...")
    df_core = extractor.get_core_data(start_date, end_date)
    
    if df_core.empty:
        logger.info("No core data found.")
        return

    # Fetch Metadata to get Creative IDs (since Core Data only has Ad IDs)
    logger.info("Fetching metadata to map Ads to Creatives...")
    df_meta = extractor.get_metadata(df_core)
    
    if df_meta.empty or 'creative_id' not in df_meta.columns:
        logger.warning("No metadata found or no creative_id mapped.")
        return

    # Fetch IDs
    creative_ids = df_meta['creative_id'].unique().tolist()
    logger.info(f"Found {len(creative_ids)} creatives. Fetching details...")
    
    # Process in chunks of 50
    chunk_size = 50
    all_details = []
    
    for i in range(0, len(creative_ids), chunk_size):
        chunk = creative_ids[i:i + chunk_size]
        logger.info(f"Fetching chunk {i // chunk_size + 1}...")
        try:
             # Use the new batch fetcher which returns a DataFrame
             # get_creative_details already handles batching, but let's pass all IDs
             # Actually `get_creative_details` in `fb_api.py` handles batching internally.
             pass
        except Exception as e:
            logger.error(f"Error in chunk loop: {e}")

    # Just call get_creative_details with ALL IDs, it handles batching
    df_details = extractor.get_creative_details(creative_ids)
    
    if df_details.empty:
        logger.warning("No creative details fetched.")
        return

    logger.info(f"Fetched {len(df_details)} creative details. Updating DB...")
    
    # Update DB - effectively we need to write to dim_creative
    # We can use pandas to_sql or a custom update query
    # Simple way: Update is_carousel, image_url, etc.
    
    engine = get_db_engine()
    
    # Prepare records for update
    records = df_details.to_dict('records')
    
    # We'll use a slow but sure loop or bulk update
    # Bulk update via SQLAlchemy is better
    from sqlalchemy import text
    
    for row in records:
        try:
            with engine.begin() as conn:
                # cid is 'id' or 'creative_id'
                cid = row.get('creative_id') or row.get('id')
                is_carousel = bool(row.get('is_carousel'))
                image_url = row.get('image_url')
                
                # Update query
                stmt = text("""
                    UPDATE dim_creative
                    SET is_carousel = :is_carousel,
                        image_url = COALESCE(:image_url, image_url)
                    WHERE creative_id = :cid
                """)
                
                conn.execute(stmt, {'is_carousel': is_carousel, 'image_url': image_url, 'cid': cid})
        except Exception as e:
            cid_log = row.get('creative_id') or row.get('id')
            logger.error(f"Failed to update creative {cid_log}: {e}")
    
    logger.info("Creative refresh complete!")

if __name__ == "__main__":
    force_refresh_creatives()
