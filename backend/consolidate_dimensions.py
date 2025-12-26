import logging
import pandas as pd
from sqlalchemy import text
from utils.db_utils import get_db_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("consolidate_dimensions")

def solve_unknown_attribution():
    """
    Since we've confirmed the account only targets Israel, 
    we will map all 'Unknown' (ID 1) entries to 'Israel' (ID 3).
    """
    engine = get_db_engine()
    
    with engine.begin() as conn:
        logger.info("Starting final attribution fix...")
        
        # 1. Update all facts that point to Unknown (1) to point to Israel (3)
        # We sum them up if a row for 3 already exists to avoid PK violations
        
        # First, find collisions
        logger.info("Merging Unknown into Israel...")
        
        # This is a bit complex for a single query if we want to be safe with PKs.
        # Strategy: 
        # a) Update rows where NO Israel row exists for those keys
        # b) Sum and delete where both exist
        
        # Part A: Update non-colliding rows
        update_safe = text("""
            UPDATE fact_country_metrics f1
            SET country_id = 3
            WHERE country_id = 1
            AND NOT EXISTS (
                SELECT 1 FROM fact_country_metrics f2
                WHERE f1.date_id = f2.date_id
                AND f1.account_id = f2.account_id
                AND f1.campaign_id = f2.campaign_id
                AND f1.adset_id = f2.adset_id
                AND f1.ad_id = f2.ad_id
                AND f1.creative_id = f2.creative_id
                AND f2.country_id = 3
            )
        """)
        r1 = conn.execute(update_safe)
        logger.info(f"Updated {r1.rowcount} Unknown rows to Israel (non-colliding).")

        # Part B: Handle collisions (Sum metrics)
        logger.info("Handling colliding rows (summing spend)...")
        collision_query = text("""
            UPDATE fact_country_metrics f_israel
            SET 
                spend = f_israel.spend + f_unknown.spend,
                impressions = f_israel.impressions + f_unknown.impressions,
                clicks = f_israel.clicks + f_unknown.clicks
            FROM fact_country_metrics f_unknown
            WHERE f_israel.country_id = 3
            AND f_unknown.country_id = 1
            AND f_israel.date_id = f_unknown.date_id
            AND f_israel.account_id = f_unknown.account_id
            AND f_israel.campaign_id = f_unknown.campaign_id
            AND f_israel.adset_id = f_unknown.adset_id
            AND f_israel.ad_id = f_unknown.ad_id
            AND f_israel.creative_id = f_unknown.creative_id
        """)
        r2 = conn.execute(collision_query)
        logger.info(f"Merged {r2.rowcount} colliding rows into Israel.")

        # Part C: Delete the merged Unknown rows
        cleanup = text("""
            DELETE FROM fact_country_metrics WHERE country_id = 1
        """)
        r3 = conn.execute(cleanup)
        logger.info(f"Deleted {r3.rowcount} remaining 'Unknown' fact rows.")

        # 2. Verify Result
        query_total = text("""
            SELECT c.country, SUM(f.spend) as total_spend
            FROM fact_country_metrics f
            JOIN dim_country c ON f.country_id = c.country_id
            GROUP BY c.country
        """)
        finals = conn.execute(query_total).fetchall()
        print("\n--- NEW TOTALS IN DB ---")
        for f in finals:
            print(f"{f[0]}: ${f[1]:.2f}")

    logger.info("✅ Attribution fix complete.")

if __name__ == "__main__":
    solve_unknown_attribution()
