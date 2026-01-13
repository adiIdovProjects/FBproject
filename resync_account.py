"""
Quick script to re-run ETL sync for a specific account
Usage: python resync_account.py
"""

import sys
sys.path.insert(0, '.')

from backend.etl.main import ETLPipeline

# Configuration
USER_ID = 35  # Your user ID
ACCOUNT_ID = 19414945  # The account to sync

if __name__ == "__main__":
    print(f"Starting ETL sync for user {USER_ID}, account {ACCOUNT_ID}...")

    pipeline = ETLPipeline()

    try:
        pipeline.run_for_user(USER_ID, [ACCOUNT_ID])
        print("✅ ETL sync completed!")
    except Exception as e:
        print(f"❌ ETL sync failed: {e}")
        import traceback
        traceback.print_exc()
