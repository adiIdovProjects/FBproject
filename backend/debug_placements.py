
import os
import sys
import pandas as pd
import logging
from datetime import date, timedelta
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

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

    days_count = 450
    end_date = date.today()
    start_date = end_date - timedelta(days=days_count)
    
    logger.info(f"Pulling placement breakdown data from {start_date} to {end_date}...")
    df = extractor.get_breakdown_data(['publisher_platform', 'platform_position'], start_date, end_date)
    
    if df.empty:
        logger.warning(f"No data returned for placement breakdown in last {days_count} days.")
        return

    logger.info(f"Retrieved {len(df)} rows of breakdown data")
    
    # Analyze platforms
    if 'publisher_platform' in df.columns:
        platforms = df['publisher_platform'].unique()
        logger.info(f"Unique Publisher Platforms: {platforms}")
        
        # Check for facebook/messenger
        for p in ['facebook', 'messenger', 'instagram', 'audience_network']:
            found = df['publisher_platform'].fillna('').str.contains(p, case=False).any()
            logger.info(f"  - {p}: {'FOUND' if found else 'NOT FOUND'}")
    
    if 'publisher_platform' in df.columns and 'platform_position' in df.columns:
        df['combined'] = df['publisher_platform'].astype(str) + " - " + df['platform_position'].astype(str)
        
        # Show all unique values
        logger.info("All unique placements found:")
        for val in sorted(df['combined'].unique()):
            logger.info(f"  - {val}")

if __name__ == "__main__":
    debug_placements()
