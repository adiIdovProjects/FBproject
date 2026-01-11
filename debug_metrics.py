
import sys
import os
from datetime import date
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.getcwd())

from backend.utils.db_utils import get_db_engine
from backend.api.repositories.ad_repository import AdRepository

def debug_ad_filtering():
    engine = get_db_engine()
    Session = sessionmaker(bind=engine)
    session = Session()

    repo = AdRepository(session)
    
    # Pick a date range
    start_date = date(2024, 1, 1) 
    end_date = date(2025, 1, 1)

    print(f"--- Debugging Ad Filtering for {start_date} to {end_date} ---")

    # Call get_ad_breakdown with a sample filter
    search_query = "ad" # Generic filter to match something
    print(f"\n[1] Testing get_ad_breakdown with search_query='{search_query}':")
    
    try:
        ads = repo.get_ad_breakdown(
            start_date, 
            end_date, 
            search_query=search_query,
            account_ids=[1] # Assuming account 1 exists
        )
        print(f"Found {len(ads)} ads matching '{search_query}'.")
        for ad in ads[:3]:
            print(f" - {ad['ad_name']} (Spend: {ad['spend']})")
            
        if len(ads) == 0:
             print("No ads found (might be expected if no match).")
             
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

    session.close()

if __name__ == "__main__":
    debug_ad_filtering()
