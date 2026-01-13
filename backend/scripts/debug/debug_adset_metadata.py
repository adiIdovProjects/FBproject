
import pandas as pd
import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from extractors.fb_api import FacebookExtractor

def debug_adset_metadata():
    load_dotenv()
    fb = FacebookExtractor()
    if not fb.initialize():
        print("Failed to initialize FacebookExtractor")
        return

    # Create a mock core DataFrame with some adset_ids
    # We'll fetch some real adset_ids first to test
    print("Fetching recent insights to get real adset IDs...")
    from datetime import date, timedelta
    end_date = date.today()
    start_date = end_date - timedelta(days=450)
    
    df_core = fb.get_core_data(start_date, end_date)
    if df_core.empty:
        print("No core data found in the last 7 days.")
        return

    print(f"Found {len(df_core['adset_id'].unique())} unique adsets in insights.")
    
    print("\nFetching metadata for these adsets...")
    df_meta = fb.get_metadata(df_core)
    
    # Check for adset metadata
    adset_cols = [c for c in df_meta.columns if c.startswith('adset_')]
    print(f"\nAdSet Metadata Columns: {adset_cols}")
    
    if 'targeting' in df_meta.columns:
        print("✅ SUCCESS: 'targeting' field found in metadata!")
        sample_targeting = df_meta['targeting'].iloc[0]
        print(f"Sample targeting data type: {type(sample_targeting)}")
        import json
        print(f"Sample targeting content (truncated): {json.dumps(sample_targeting, indent=2)[:500]}...")
    else:
        print("❌ FAILURE: 'targeting' field NOT found in metadata.")
        print(f"Available columns: {df_meta.columns.tolist()}")

if __name__ == "__main__":
    debug_adset_metadata()
