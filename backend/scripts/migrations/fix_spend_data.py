
import os
import sys
from datetime import date

# Add backend to path so imports work
sys.path.append(os.path.join(os.path.dirname(__file__)))

from etl.main import ETLPipeline

def fix_data():
    pipeline = ETLPipeline()
    fix_date = date(2024, 9, 29)
    print(f"Running ETL fix for {fix_date}...")
    # Run for single day
    pipeline.run(fix_date, fix_date)

if __name__ == "__main__":
    fix_data()
