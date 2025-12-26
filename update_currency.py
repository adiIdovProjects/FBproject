#!/usr/bin/env python
"""Update currency to BRL in database"""
import sys
sys.path.insert(0, 'backend')

from backend.utils.db_utils import get_db_engine
from sqlalchemy import text

# Update currency to BRL
engine = get_db_engine()
with engine.connect() as conn:
    # Update the currency
    result = conn.execute(
        text("UPDATE dim_account SET currency = 'BRL', account_name = 'Selina Ads' WHERE account_id = '3323521271263775'")
    )
    conn.commit()

    print("=" * 60)
    print("Successfully updated currency to BRL!")
    print("=" * 60)

    # Verify the update
    result = conn.execute(text("SELECT account_id, account_name, currency FROM dim_account WHERE account_id != 0")).fetchall()

    for r in result:
        print(f"Account ID: {r[0]}")
        print(f"Name: {r[1]}")
        print(f"Currency: {r[2]}")
        print("-" * 60)

print("\nCurrency updated! Refresh your dashboard to see BRL currency.")
