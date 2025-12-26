
import sys
import os
import pandas as pd
from sqlalchemy import text

# Add current directory to path
sys.path.append(os.getcwd())

from utils.db_utils import get_db_engine

def debug_age_data():
    try:
        engine = get_db_engine()
        with engine.connect() as conn:
            print("--- dim_age contents ---")
            dims = conn.execute(text("SELECT * FROM dim_age;")).fetchall()
            for d in dims:
                print(d)
            
            print("\n--- fact_age_gender_metrics summary ---")
            count = conn.execute(text("SELECT count(*) FROM fact_age_gender_metrics;")).scalar()
            print(f"Total rows: {count}")
            
            if count > 0:
                print("\n--- Distribution of age_id in fact_age_gender_metrics ---")
                dist = conn.execute(text("""
                    SELECT 
                        f.age_id, 
                        a.age_group, 
                        count(*) as row_count, 
                        sum(spend) as total_spend
                    FROM fact_age_gender_metrics f
                    LEFT JOIN dim_age a ON f.age_id = a.age_id
                    GROUP BY f.age_id, a.age_group
                    ORDER BY row_count DESC;
                """)).fetchall()
                for row in dist:
                    print(row)
                
                print("\n--- Sample rows (raw) ---")
                samples = conn.execute(text("SELECT * FROM fact_age_gender_metrics LIMIT 5;")).fetchall()
                for s in samples:
                    print(s)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_age_data()
