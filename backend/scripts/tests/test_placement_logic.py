
import pandas as pd
import numpy as np
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.transformers.core_transformer import CoreTransformer

def test_placement_naming():
    transformer = CoreTransformer()
    
    # Mock data with various placement scenarios
    data = {
        'date_start': ['2023-01-01', '2023-01-01', '2023-01-01', '2023-01-01'],
        'publisher_platform': ['instagram', 'instagram', 'facebook', 'messenger'],
        'platform_position': ['instagram_stories', 'feed', 'feed', 'messenger_inbox'],
        'spend': [10.0, 5.0, 20.0, 2.0],
        'impressions': [100, 50, 200, 20],
        'clicks': [1, 0, 5, 0]
    }
    
    df = pd.DataFrame(data)
    
    # Run transformation
    # We only care about the breakdown handling here
    df_transformed = transformer._handle_breakdown_columns(df)
    
    print("Transformed Placements:")
    for p in df_transformed['placement_name'].unique():
        print(f"  - {p}")
    
    # Expected results:
    # instagram - stories (from instagram_stories)
    # instagram - feed
    # facebook - feed
    # messenger - inbox (from messenger_inbox)
    
    expected = [
        'instagram - stories',
        'instagram - feed',
        'facebook - feed',
        'messenger - inbox'
    ]
    
    for e in expected:
        assert e in df_transformed['placement_name'].values, f"Expected {e} not found"
    
    print("\n✅ Placement naming logic verified!")

if __name__ == "__main__":
    test_placement_naming()
