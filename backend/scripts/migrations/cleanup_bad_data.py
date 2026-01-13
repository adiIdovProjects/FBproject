
import os
import sys
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from utils.db_utils import get_db_engine

def cleanup_data():
    engine = get_db_engine()
    date_id = 20240929
    
    tables = [
        'fact_core_metrics',
        'fact_placement_metrics',
        'fact_age_gender_metrics',
        'fact_country_metrics',
        'fact_action_metrics'
    ]
    
    print(f"Cleaning up data for date_id {date_id}...")
    
    try:
        with engine.begin() as conn:
            for table in tables:
                query = text(f"DELETE FROM {table} WHERE date_id = :date_id")
                result = conn.execute(query, {"date_id": date_id})
                print(f"Deleted {result.rowcount} rows from {table}")
                
        print("Cleanup complete.")
    except Exception as e:
        print(f"Error during cleanup: {e}")

if __name__ == "__main__":
    cleanup_data()
