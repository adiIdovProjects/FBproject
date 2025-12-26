
import os
import sys
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from utils.db_utils import get_db_engine

def check_creatives():
    engine = get_db_engine()
    
    with engine.connect() as conn:
        # Count rows in dim_creative
        result = conn.execute(text("SELECT COUNT(*) FROM dim_creative")).fetchone()
        print(f"Total rows in dim_creative: {result[0]}")
        
        # Show sample
        rows = conn.execute(text("SELECT * FROM dim_creative LIMIT 5")).fetchall()
        print("\nSample rows in dim_creative:")
        for row in rows:
            print(row)

        # Check fact_core_metrics
        result = conn.execute(text("SELECT COUNT(*) FROM fact_core_metrics WHERE creative_id != 0")).fetchone()
        print(f"\nRows in fact_core_metrics with non-zero creative_id: {result[0]}")
        
        if result[0] > 0:
            sample = conn.execute(text("SELECT creative_id FROM fact_core_metrics WHERE creative_id != 0 LIMIT 5")).fetchall()
            print(f"Sample creative_ids: {[r[0] for r in sample]}")

        # Check fact_action_metrics
        result = conn.execute(text("SELECT COUNT(*) FROM fact_action_metrics WHERE creative_id != 0")).fetchone()
        print(f"Rows in fact_action_metrics with non-zero creative_id: {result[0]}")

        # Check dim_ad
        result = conn.execute(text("SELECT COUNT(*) FROM dim_ad WHERE creative_id != 0")).fetchone()
        print(f"\nRows in dim_ad with non-zero creative_id: {result[0]}")
        
        if result[0] > 0:
            sample = conn.execute(text("SELECT ad_id, ad_name, creative_id FROM dim_ad WHERE creative_id != 0 LIMIT 5")).fetchall()
            print("Sample ad metadata:")
            for r in sample:
                print(f"  Ad ID: {r[0]}, Name: {r[1]}, Creative ID: {r[2]}")
        else:
            print("All ads in dim_ad have creative_id = 0")

if __name__ == "__main__":
    check_creatives()
