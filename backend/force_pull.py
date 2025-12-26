import os
import pandas as pd
from datetime import datetime, timedelta
from etl.main import ETLPipeline
from config.settings import FIRST_PULL_DAYS
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)

def force_pull():
    pipeline = ETLPipeline()
    
    # Force pull for last 5 days to be sure
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=5)
    
    print(f"Force pulling from {start_date} to {end_date}")
    
    pipeline.run(start_date_override=start_date)

if __name__ == "__main__":
    force_pull()
