
import os
import pandas as pd
import logging
from dotenv import load_dotenv
from extractors.fb_api import FacebookExtractor

# Load env vars
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DebugPlacements")

def debug_placements():
    extractor = FacebookExtractor()
    if not extractor.initialize():
        logger.error("Failed to initialize extractor")
        return

    logger.info("Pulling placement breakdown data for the last 7 days...")
    df = extractor.get_breakdown_data(['publisher_platform', 'platform_position'], 7)
    
    if df.empty:
        logger.warning("No data returned for placement breakdown")
        return

    logger.info(f"Retrieved {len(df)} rows of breakdown data")
    
    if 'publisher_platform' in df.columns:
        logger.info(f"Unique Publisher Platforms: {df['publisher_platform'].unique()}")
    else:
        logger.warning("publisher_platform column missing!")

    if 'platform_position' in df.columns:
        logger.info(f"Unique Platform Positions: {df['platform_position'].unique()}")
    else:
        logger.warning("platform_position column missing!")

    if 'publisher_platform' in df.columns and 'platform_position' in df.columns:
        df['combined'] = df['publisher_platform'].astype(str) + " - " + df['platform_position'].astype(str)
        logger.info(f"Unique Combined Placements: {df['combined'].unique()}")
        
        # Check for facebook/messenger
        fb_exists = df['combined'].str.contains('facebook', case=False).any()
        ms_exists = df['combined'].str.contains('messenger', case=False).any()
        
        logger.info(f"Facebook placements found: {fb_exists}")
        logger.info(f"Messenger placements found: {ms_exists}")
        
        if not fb_exists or not ms_exists:
            logger.warning("Missing Facebook or Messenger placements!")
            # Show all unique values to see what's there
            for val in df['combined'].unique():
                logger.info(f"  - {val}")

if __name__ == "__main__":
    debug_placements()
