#!/usr/bin/env python
"""Check currency in database"""
import sys
sys.path.insert(0, 'backend')

from backend.utils.db_utils import get_db_engine
from sqlalchemy import text

engine = get_db_engine()
with engine.connect() as conn:
    result = conn.execute(text("SELECT account_id, account_name, currency FROM dim_account WHERE account_id != 0")).fetchall()

    print("=" * 60)
    print("Current accounts in database:")
    print("=" * 60)

    if result:
        for r in result:
            print(f"  Account ID: {r[0]}")
            print(f"  Name: {r[1]}")
            print(f"  Currency: {r[2]}")
            print("-" * 60)
    else:
        print("  ⚠️  No accounts found in database")
        print("  You need to run the ETL to fetch currency from Facebook")
        print("-" * 60)

    print("\n💡 To update currency from Facebook, run:")
    print("   cd backend && python run_etl.py")
    print("=" * 60)
