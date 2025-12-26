
import os
import pandas as pd
from sqlalchemy import text
from utils.db_utils import get_db_engine
from dotenv import load_dotenv

load_dotenv()

def check_spend():
    engine = get_db_engine()
    target_date = '2024-09-29'
    
    # Query for the specific date
    query = text("""
        SELECT 
            d.date,
            SUM(f.spend) as total_spend,
            acc.account_name,
            acc.currency
        FROM fact_core_metrics f
        JOIN dim_date d ON f.date_id = d.date_id
        JOIN dim_account acc ON f.account_id = acc.account_id
        WHERE d.date = :target_date
        GROUP BY d.date, acc.account_name, acc.currency
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query, {"target_date": target_date}).fetchall()
        
    print(f"\n--- Spend for {target_date} ---")
    if not result:
        print("No data found for this date.")
        
        # Check if date exists in dim_date at all
        date_check = conn.execute(text("SELECT * FROM dim_date WHERE date = :target_date"), {"target_date": target_date}).fetchone()
        if date_check:
            print(f"Date {target_date} exists in dim_date (ID: {date_check[0]}), but no fact rows.")
        else:
            print(f"Date {target_date} does NOT exist in dim_date.")
            
        # Check what dates WE HAVE
        latest_dates = conn.execute(text("SELECT MAX(date) FROM dim_date")).fetchone()
        print(f"Latest date in dim_date: {latest_dates[0]}")
    else:
        for row in result:
            print(f"Account: {row[2]} ({row[3]}) | Spend: {row[1]} | Date: {row[0]}")

    # Breakdown by campaign
    query_breakdown = text("""
        SELECT 
            c.campaign_name,
            SUM(f.spend) as spend
        FROM fact_core_metrics f
        JOIN dim_date d ON f.date_id = d.date_id
        JOIN dim_campaign c ON f.campaign_id = c.campaign_id
        WHERE d.date = :target_date
        GROUP BY c.campaign_name
        ORDER BY spend DESC
    """)
    
    with engine.connect() as conn:
        breakdown = conn.execute(query_breakdown, {"target_date": target_date}).fetchall()
        
    print(f"\n--- Breakdown by Campaign for {target_date} ---")
    for row in breakdown:
        print(f"Campaign: {row[0]} | Spend: {row[1]}")

if __name__ == "__main__":
    check_spend()
