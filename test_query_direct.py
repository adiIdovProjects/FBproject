from backend.utils.db_utils import get_db_engine
from sqlalchemy import text
import time
from datetime import date

engine = get_db_engine()
conn = engine.connect()

query = text("""
    SELECT
        d.date::date as date,
        SUM(f.spend) as spend,
        SUM(f.impressions) as impressions,
        SUM(f.clicks) as clicks,
        COALESCE(SUM(conv.action_count), 0) as conversions,
        COALESCE(SUM(conv.action_value), 0) as conversion_value
    FROM fact_core_metrics f
    JOIN dim_date d ON f.date_id = d.date_id
    LEFT JOIN (
        SELECT date_id, account_id, campaign_id, adset_id, ad_id, creative_id,
               SUM(action_count) as action_count,
               SUM(action_value) as action_value
        FROM fact_action_metrics fam
        JOIN dim_action_type dat ON fam.action_type_id = dat.action_type_id
        WHERE dat.is_conversion = TRUE
        GROUP BY 1, 2, 3, 4, 5, 6
    ) conv ON f.date_id = conv.date_id
          AND f.account_id = conv.account_id
          AND f.campaign_id = conv.campaign_id
          AND f.adset_id = conv.adset_id
          AND f.ad_id = conv.ad_id
          AND f.creative_id = conv.creative_id
    WHERE d.date >= :start_date
        AND d.date <= :end_date
    GROUP BY d.date
    ORDER BY date ASC
""")

params = {
    'start_date': date(2024, 10, 1),
    'end_date': date(2024, 11, 30)
}

print("Testing query...")
start = time.time()
try:
    result = conn.execute(query, params)
    rows = result.fetchall()
    elapsed = time.time() - start
    print(f"Query completed successfully")
    print(f"   Rows returned: {len(rows)}")
    print(f"   Time: {elapsed:.2f}s")
    if rows:
        print(f"   First row: {dict(rows[0]._mapping)}")
except Exception as e:
    elapsed = time.time() - start
    print(f"Query failed after {elapsed:.2f}s")
    print(f"   Error: {e}")

conn.close()
