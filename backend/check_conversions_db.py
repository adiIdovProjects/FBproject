
import logging
from sqlalchemy import text
from backend.api.dependencies import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CheckConversions")

def check_conversions():
    db = SessionLocal()
    try:
        # 1. Check which action types are marked as conversions
        logger.info("--- Conversion Action Types ---")
        query_types = text("SELECT action_type_id, action_type, is_conversion FROM dim_action_type WHERE is_conversion = TRUE")
        types = db.execute(query_types).fetchall()
        for t in types:
            logger.info(f"  - ID: {t.action_type_id}, Type: {t.action_type}")

        # 2. Check total conversion counts by type in fact_action_metrics
        logger.info("\n--- Conversion Counts by Type (fact_action_metrics) ---")
        query_counts = text("""
            SELECT dat.action_type, SUM(fam.action_count) as total_count, COUNT(*) as row_count
            FROM fact_action_metrics fam
            JOIN dim_action_type dat ON fam.action_type_id = dat.action_type_id
            WHERE dat.is_conversion = TRUE
            GROUP BY dat.action_type
        """)
        counts = db.execute(query_counts).fetchall()
        for c in counts:
            logger.info(f"  - {c.action_type}: {c.total_count} (across {c.row_count} rows)")

        # 3. Check for attribution windows (to see if we are summing multiple windows)
        logger.info("\n--- Attribution Windows in fact_action_metrics ---")
        query_windows = text("SELECT attribution_window, COUNT(*) as row_count FROM fact_action_metrics GROUP BY attribution_window")
        windows = db.execute(query_windows).fetchall()
        for w in windows:
            logger.info(f"  - Window: {w.attribution_window}, Rows: {w.row_count}")

    except Exception as e:
        logger.error(f"Failed to check conversions: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_conversions()
