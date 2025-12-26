"""
test_facebook_response.py - See what Facebook API actually returns

Run: python backend/tests/test_facebook_response.py
"""

import os
import sys
import pandas as pd
from datetime import date, timedelta
from dotenv import load_dotenv

# Load .env file
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(backend_dir, '.env')
if not os.path.exists(env_path):
    # Try parent directory
    env_path = os.path.join(os.path.dirname(backend_dir), '.env')

load_dotenv(env_path)

print(f"Loading .env from: {env_path}")
print(f"Env file exists: {os.path.exists(env_path)}")

# Add parent directory to path
sys.path.insert(0, backend_dir)

from extractors.fb_api import FacebookExtractor

print("=" * 80)
print("FACEBOOK API RESPONSE TEST")
print("=" * 80)

# Initialize extractor
extractor = FacebookExtractor()

if not extractor.initialize():
    print("❌ Failed to initialize Facebook API")
    print(f"Account ID: {extractor.account_id}")
    print(f"Access Token: {'***' if extractor.access_token else 'MISSING'}")
    print(f"App ID: {extractor.app_id}")
    sys.exit(1)

print("✅ Facebook API initialized")
print()

# Pull just 1 day of data to see columns
print("Fetching 1 day of data to check columns...")
df_core = extractor.get_core_data(days=450)

if df_core.empty:
    print("❌ No data returned from Facebook")
    sys.exit(1)

print()
print("=" * 80)
print("FACEBOOK RETURNED THESE COLUMNS:")
print("=" * 80)
print("\n".join(df_core.columns.tolist()))

print()
print("=" * 80)
print("SAMPLE DATA (First Row):")
print("=" * 80)
if len(df_core) > 0:
    first_row = df_core.iloc[0]
    for col in df_core.columns:
        value = first_row[col]
        print(f"{col:30s} = {value}")

print()
print("=" * 80)
print("CLICK-RELATED COLUMNS:")
print("=" * 80)
click_cols = [col for col in df_core.columns if 'click' in col.lower()]
if click_cols:
    print("\n".join(click_cols))
    print()
    print("Sample values:")
    for col in click_cols:
        print(f"{col:30s} = {df_core[col].iloc[0] if len(df_core) > 0 else 'N/A'}")
else:
    print("⚠️ NO CLICK COLUMNS FOUND!")

print()
print("=" * 80)
print("NAME COLUMNS:")
print("=" * 80)
name_cols = [col for col in df_core.columns if 'name' in col.lower()]
if name_cols:
    print("\n".join(name_cols))
    print()
    print("Sample values:")
    for col in name_cols:
        value = df_core[col].iloc[0] if len(df_core) > 0 else 'N/A'
        print(f"{col:30s} = {value}")
else:
    print("⚠️ NO NAME COLUMNS FOUND!")

print()
print("=" * 80)
print("TEST COMPLETE")
print("=" * 80)