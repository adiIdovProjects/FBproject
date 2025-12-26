"""
Test if .astype(str) corrupts large integers
"""
import pandas as pd
import numpy as np

print("=" * 80)
print("Testing .astype(str) on Large Integers")
print("=" * 80)

# Create DataFrame with large integers
df = pd.DataFrame({
    'campaign_id': [120211929591850104, 120211928789230104, 120212133170820104]
})

print(f"\n1. Original values (int64):")
print(f"dtype: {df['campaign_id'].dtype}")
print(f"values: {df['campaign_id'].tolist()}")

# Convert to string
df['campaign_id_str'] = df['campaign_id'].astype(str)

print(f"\n2. After .astype(str):")
print(f"dtype: {df['campaign_id_str'].dtype}")
print(f"values: {df['campaign_id_str'].tolist()}")

# Convert back to int
df['campaign_id_back'] = pd.to_numeric(df['campaign_id_str'], errors='coerce').fillna(0).astype('int64')

print(f"\n3. After converting back to int64:")
print(f"dtype: {df['campaign_id_back'].dtype}")
print(f"values: {df['campaign_id_back'].tolist()}")

# Check if they match
match = (df['campaign_id'] == df['campaign_id_back']).all()
print(f"\n4. Values match original? {match}")

if not match:
    print("\n❌ CORRUPTION DETECTED!")
    for idx in df.index:
        orig = df.loc[idx, 'campaign_id']
        back = df.loc[idx, 'campaign_id_back']
        if orig != back:
            print(f"   Row {idx}: {orig} → {back} (diff: {orig - back})")

print("\n" + "=" * 80)
