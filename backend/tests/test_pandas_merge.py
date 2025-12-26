"""
Test pandas merge behavior with large integers to identify precision loss
"""
import pandas as pd
import numpy as np

print("=" * 80)
print("Testing Pandas Merge with Large Integers (18 digits)")
print("=" * 80)

# Create test data with actual Facebook campaign IDs
df1 = pd.DataFrame({
    'campaign_id': [120211929591850104, 120211928789230104, 120212133170820104],
    'campaign_name': ['Campaign A', 'Campaign B', 'Campaign C']
})

df2 = pd.DataFrame({
    'campaign_id': [120211929591850104],
    'adset_id': [999]
})

print("\n1. Original DataFrames:")
print(f"df1 campaign_id dtype: {df1['campaign_id'].dtype}")
print(f"df1 campaign_ids: {df1['campaign_id'].tolist()}")
print(f"df2 campaign_id dtype: {df2['campaign_id'].dtype}")
print(f"df2 campaign_ids: {df2['campaign_id'].tolist()}")

# Test 1: Int64 merge
print("\n2. Test OUTER merge with int64:")
df_merged = df1.merge(df2, on='campaign_id', how='outer')
print(f"After merge - campaign_id dtype: {df_merged['campaign_id'].dtype}")
print(f"After merge - campaign_ids: {df_merged['campaign_id'].tolist()}")

# Test 2: String merge
print("\n3. Test OUTER merge with strings:")
df1_str = df1.copy()
df2_str = df2.copy()
df1_str['campaign_id'] = df1_str['campaign_id'].astype(str)
df2_str['campaign_id'] = df2_str['campaign_id'].astype(str)

print(f"df1_str campaign_ids (as string): {df1_str['campaign_id'].tolist()}")
print(f"df2_str campaign_ids (as string): {df2_str['campaign_id'].tolist()}")

df_merged_str = df1_str.merge(df2_str, on='campaign_id', how='outer')
print(f"After merge - campaign_id dtype: {df_merged_str['campaign_id'].dtype}")
print(f"After merge - campaign_ids (still strings): {df_merged_str['campaign_id'].tolist()}")

# Convert back to int
print("\n4. Convert strings back to int64:")
df_merged_str['campaign_id_int'] = pd.to_numeric(df_merged_str['campaign_id'], errors='coerce').fillna(0).astype('int64')
print(f"campaign_id_int values: {df_merged_str['campaign_id_int'].tolist()}")

# Test 3: Direct string to int conversion
print("\n5. Test direct string-to-int conversion:")
test_id_str = '120211929591850104'
test_id_int = pd.to_numeric(test_id_str, errors='coerce')
print(f"String: {test_id_str}")
print(f"pd.to_numeric result: {test_id_int} (type: {type(test_id_int).__name__})")
print(f"As int64: {int(test_id_int)}")

# Test 4: Check if it's a Python int vs numpy int64 issue
print("\n6. Test Python int() vs np.int64():")
test_val = 120211929591850104
print(f"Original Python int: {test_val}")
print(f"Type: {type(test_val)}")

np_int64_val = np.int64(test_val)
print(f"As np.int64: {np_int64_val}")
print(f"Type: {type(np_int64_val)}")

pd_series = pd.Series([test_val])
print(f"In pandas Series dtype: {pd_series.dtype}")
print(f"Value: {pd_series.iloc[0]}")

print("\n" + "=" * 80)
print("Test complete!")
print("=" * 80)
