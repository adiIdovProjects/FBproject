
import logging
from sqlalchemy import text
from backend.api.dependencies import SessionLocal
from datetime import date, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CheckConversionsRecent")

def check_recent():
    db = SessionLocal()
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        logger.info(f"--- Checking from {start_date} to {end_date} ---")

        # 1. Aggregated metrics like the repository does
        query = text("""
            SELECT
                SUM(f.spend) as total_spend,
                COALESCE(SUM(conv.action_count), 0) as conversions_from_actions,
                SUM(f.leads) as leads_from_core,
                SUM(f.lead_website) as lead_website_from_core,
                SUM(f.lead_form) as lead_form_from_core
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            LEFT JOIN (
                SELECT date_id, account_id, campaign_id, adset_id, ad_id, creative_id,
                       SUM(action_count) as action_count
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
        """)
        
        res = db.execute(query, {"start_date": start_date, "end_date": end_date}).fetchone()
        logger.info(f"Aggregated Result:")
        logger.info(f"  - Conversions (Actions): {res.conversions_from_actions}")
        logger.info(f"  - Leads (Core): {res.leads_from_core}")
        logger.info(f"  - Lead Website (Core): {res.lead_website_from_core}")
        logger.info(f"  - Lead Form (Core): {res.lead_form_from_core}")

        # 2. Check for duplicates in fact_core_metrics
        logger.info("\n--- Potential Duplicate PKs in fact_core_metrics ---")
        query_dupes = text("""
            SELECT date_id, account_id, campaign_id, adset_id, ad_id, creative_id, COUNT(*) as row_count
            FROM fact_core_metrics
            GROUP BY 1, 2, 3, 4, 5, 6
            HAVING COUNT(*) > 1
            LIMIT 5
        """)
        dupes = db.execute(query_dupes).fetchall()
        if not dupes:
            logger.info("  No duplicates found.")
        else:
            for d in dupes:
                logger.info(f"  - Key: {d[:-1]}, Count: {d[-1]}")

        # 3. Check what's actually in fact_action_metrics for this period directly
        logger.info("\n--- Direct fact_action_metrics counts ---")
        query_direct = text("""
            SELECT dat.action_type, SUM(fam.action_count) as total_count
            FROM fact_action_metrics fam
            JOIN dim_action_type dat ON fam.action_type_id = dat.action_type_id
            JOIN dim_date d ON fam.date_id = d.date_id
            WHERE dat.is_conversion = TRUE
              AND d.date >= :start_date
              AND d.date <= :end_date
            GROUP BY dat.action_type
        """)
        direct = db.execute(query_direct, {"start_date": start_date, "end_date": end_date}).fetchall()
        for r in direct:
            logger.info(f"  - {r.action_type}: {r.total_count}")

    except Exception as e:
        logger.error(f"Failed to check recent conversions: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_recent()
