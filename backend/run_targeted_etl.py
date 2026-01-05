
import os
import sys
from datetime import date, timedelta
from dotenv import load_dotenv

from backend.etl.main import ETLPipeline

load_dotenv()

def run_targeted_etl():
    # Last 7 days
    end_date = date.today() - timedelta(days=1)
    start_date = end_date - timedelta(days=7)
    
    print(f"Running targeted ETL for {start_date} to {end_date}...")
    
    pipeline = ETLPipeline()
    try:
        pipeline.run(start_date, end_date)
        print("Targeted ETL completed successfully!")
    except Exception as e:
        print(f"Targeted ETL failed: {e}")

if __name__ == "__main__":
    run_targeted_etl()
