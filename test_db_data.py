"""Check if database has the right data structure and content"""
import sys
sys.path.insert(0, '.')

from backend.utils.db_utils import get_db_engine
from sqlalchemy import text

engine = get_db_engine()

with engine.connect() as conn:
    print("=" * 80)
    print("DATABASE DATA CHECK")
    print("=" * 80)

    # 1. Check fact_core_metrics structure
    print("\n1. Checking fact_core_metrics columns...")
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'fact_core_metrics'
        ORDER BY ordinal_position
    """))
    columns = [row[0] for row in result.fetchall()]
    print(f"   Columns: {', '.join(columns[:10])}...")

    # 2. Check total rows
    result = conn.execute(text("SELECT COUNT(*) FROM fact_core_metrics"))
    total = result.scalar()
    print(f"\n2. Total rows in fact_core_metrics: {total}")

    # 3. Check date range in data
    result = conn.execute(text("""
        SELECT MIN(d.date) as min_date, MAX(d.date) as max_date
        FROM fact_core_metrics f
        JOIN dim_date d ON f.date_id = d.date_id
    """))
    row = result.fetchone()
    print(f"\n3. Date range in data: {row[0]} to {row[1]}")

    # 4. Check if there's data in the specific range
    result = conn.execute(text("""
        SELECT COUNT(*)
        FROM fact_core_metrics f
        JOIN dim_date d ON f.date_id = d.date_id
        WHERE d.date BETWEEN '2024-10-01' AND '2024-11-30'
    """))
    count_in_range = result.scalar()
    print(f"\n4. Rows between 2024-10-01 and 2024-11-30: {count_in_range}")

    # 5. Sample data
    if count_in_range > 0:
        result = conn.execute(text("""
            SELECT d.date, f.spend, f.impressions, f.clicks
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            WHERE d.date BETWEEN '2024-10-01' AND '2024-11-30'
            ORDER BY d.date
            LIMIT 5
        """))
        print(f"\n5. Sample data:")
        for row in result.fetchall():
            print(f"   {row[0]}: spend=${row[1]:.2f}, impressions={row[2]}, clicks={row[3]}")
    else:
        print("\n5. NO DATA in requested date range!")
        print("   You may need to run ETL to fetch data for this period")

    print("\n" + "=" * 80)
