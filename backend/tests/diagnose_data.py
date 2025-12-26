"""
diagnose_data.py - Check what data is actually in the database

Run this to see:
1. What campaign names look like
2. What click values are
3. What columns came from Facebook
"""

import pandas as pd
from utils.db_utils import get_db_engine

engine = get_db_engine()

print("=" * 80)
print("DATABASE DIAGNOSTIC")
print("=" * 80)

# 1. Check campaigns
print("\n📊 CAMPAIGNS:")
print("-" * 80)
df_campaigns = pd.read_sql("""
    SELECT 
        campaign_id,
        campaign_name,
        objective,
        campaign_status
    FROM dim_campaign
    LIMIT 10
""", engine)
print(df_campaigns.to_string())

# 2. Check fact data with clicks
print("\n📊 FACT CORE METRICS (Sample):")
print("-" * 80)
df_facts = pd.read_sql("""
    SELECT 
        f.date_id,
        c.campaign_name,
        f.spend,
        f.impressions,
        f.clicks,
        f.purchases
    FROM fact_core_metrics f
    JOIN dim_campaign c ON f.campaign_id = c.campaign_id
    JOIN dim_date d ON f.date_id = d.date_id
    ORDER BY d.date DESC
    LIMIT 10
""", engine)
print(df_facts.to_string())

# 3. Check totals
print("\n📊 TOTALS:")
print("-" * 80)
df_totals = pd.read_sql("""
    SELECT 
        SUM(spend) as total_spend,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(purchases) as total_purchases
    FROM fact_core_metrics
""", engine)
print(df_totals.to_string())

# 4. Check if there are any non-zero clicks
print("\n📊 ROWS WITH CLICKS > 0:")
print("-" * 80)
df_with_clicks = pd.read_sql("""
    SELECT COUNT(*) as rows_with_clicks
    FROM fact_core_metrics
    WHERE clicks > 0
""", engine)
print(f"Rows with clicks > 0: {df_with_clicks['rows_with_clicks'].iloc[0]}")

print("\n" + "=" * 80)
print("DIAGNOSIS COMPLETE")
print("=" * 80)