
import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.abspath('backend'))

try:
    from api.dependencies import SessionLocal
    
    db = SessionLocal()
    date_str = '2024-09-29'

    print(f"--- Debugging Data for {date_str} ---")

    # 1. Check DimAccount Currency
    try:
        account = db.execute(text("SELECT * FROM dim_account LIMIT 1")).fetchone()
        print(f"Account: {account}")
    except Exception as e:
        print(f"Error fetching account: {e}")

    # 2. Total Spend from FactCoreMetrics
    try:
        query = text("""
            SELECT SUM(spend) as total_spend, COUNT(*) as rows
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            WHERE d.date = :date
        """)
        result = db.execute(query, {'date': date_str}).fetchone()
        print(f"Total Spend (Core): {result.total_spend}")
        print(f"Row Count (Core): {result.rows}")
    except Exception as e:
        print(f"Error fetching core metrics: {e}")

    # 3. Breakdown by Campaign
    try:
        query = text("""
            SELECT c.campaign_name, SUM(f.spend) as spend
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_campaign c ON f.campaign_id = c.campaign_id
            WHERE d.date = :date
            GROUP BY c.campaign_name
            ORDER BY spend DESC
        """)
        results = db.execute(query, {'date': date_str}).fetchall()
        print("\n--- Campaign Breakdown ---")
        for row in results:
            print(f"{row.campaign_name}: {row.spend}")
    except Exception as e:
        print(f"Error fetching campaign breakdown: {e}")

    # 4. Breakdown by Platform (using FactPlacementMetrics)
    try:
        query = text("""
            SELECT p.placement_name, SUM(f.spend) as spend
            FROM fact_placement_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_placement p ON f.placement_id = p.placement_id
            WHERE d.date = :date
            GROUP BY p.placement_name
            ORDER BY spend DESC
        """)
        results = db.execute(query, {'date': date_str}).fetchall()
        print("\n--- Placement Breakdown ---")
        for row in results:
            print(f"{row.placement_name}: {row.spend}")
    except Exception as e:
        print(f"Error fetching placement breakdown: {e}")

    db.close()

except ImportError as e:
    print(f"Import Error: {e}")
except Exception as e:
    print(f"General Error: {e}")
