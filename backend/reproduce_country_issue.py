import pandas as pd
import numpy as np
import sys
import os

# Mock the environment or add paths
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from transformers.core_transformer import clean_and_transform
from transformers.fact_builder import build_fact_tables
from config.settings import MISSING_DIM_VALUE

def reproduce():
    print(f"MISSING_DIM_VALUE is: {MISSING_DIM_VALUE}")
    
    # Simulate raw data from FB API
    # 1. A core row (Total spend)
    # 2. A geographic row with a valid country (IL)
    # 3. A geographic row with missing country (None/NaN) - This is the "Unknown" candidate
    raw_data = pd.DataFrame([
        {
            'date_start': '2025-12-01',
            'campaign_id': '111',
            'spend': 100.0,
            '_data_source': 'core'
        },
        {
            'date_start': '2025-12-01',
            'campaign_id': '111',
            'spend': 70.0,
            'country': 'IL',
            '_data_source': 'geographic'
        },
        {
            'date_start': '2025-12-01',
            'campaign_id': '111',
            'spend': 30.0,
            'country': None,
            '_data_source': 'geographic'
        }
    ])

    print("\n--- RAW DATA ---")
    print(raw_data)

    # Step 1: Core Transformation
    df_clean = clean_and_transform(raw_data)
    print("\n--- CLEANED DATA ---")
    print(df_clean[['date_id', 'country', 'spend', '_data_source']])

    # Step 2: Fact Building
    facts = build_fact_tables(df_clean)
    
    if 'fact_country_metrics' in facts:
        print("\n--- FACT COUNTRY METRICS ---")
        print(facts['fact_country_metrics'])
        
        # Check if "Unknown" is present
        unknown_present = facts['fact_country_metrics']['country'].isin([MISSING_DIM_VALUE, 'Unknown', 'N/A']).any()
        print(f"\nIs 'Unknown' present in fact table? {unknown_present}")
    else:
        print("\n❌ NO fact_country_metrics BUILT")

if __name__ == "__main__":
    reproduce()
