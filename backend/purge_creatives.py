
import os
import sys
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from backend.utils.db_utils import get_db_engine

def purge_creatives():
    engine = get_db_engine()
    print("Purging non-zero creatives from dim_creative...")
    try:
        with engine.begin() as conn:
            res = conn.execute(text("DELETE FROM dim_creative WHERE creative_id != 0"))
            print(f"Deleted {res.rowcount} rows.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    purge_creatives()
