import sys
from sqlalchemy import text
sys.path.insert(0, 'backend')
from backend.utils.db_utils import get_db_engine

engine = get_db_engine()

# Dates based on recent logs (30 day default)
# Current: 2025-12-09 to 2026-01-07
# Previous: 2025-11-09 to 2025-12-08

ranges = [
    ("Previous Period", '2025-11-09', '2025-12-08'),
    ("Current Period", '2025-12-09', '2026-01-07')
]

with engine.connect() as conn:
    print("=" * 80)
    print("Checking Data Availability for Accounts")
    print("=" * 80)

    for label, start, end in ranges:
        print(f"\n--- {label} ({start} to {end}) ---")
        sql = text("""
            SELECT 
                f.account_id, 
                a.account_name,
                COUNT(*) as rows_count,
                SUM(f.spend) as total_spend
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_account a ON f.account_id = a.account_id
            WHERE d.date >= :start AND d.date <= :end
            GROUP BY f.account_id, a.account_name
        """)
        result = conn.execute(sql, {"start": start, "end": end}).fetchall()
        
        if not result:
            print("  (No data found for any account)")
        
        for row in result:
            print(f"  Account: {row[1]} (ID: {row[0]})")
            print(f"    Rows: {row[2]}")
            print(f"    Total Spend: {row[3]}")
    print("=" * 80)
