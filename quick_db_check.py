"""Quick check if there's data in the database"""
import sys
sys.path.insert(0, '.')

from backend.utils.db_utils import get_db_engine
from sqlalchemy import text

engine = get_db_engine()

with engine.connect() as conn:
    # Check fact_core_metrics
    result = conn.execute(text("SELECT COUNT(*) FROM fact_core_metrics"))
    count = result.scalar()
    print(f"fact_core_metrics: {count} rows")

    # Check if there's data in the date range
    result = conn.execute(text("""
        SELECT COUNT(*) FROM fact_core_metrics
        WHERE date_day BETWEEN '2024-10-01' AND '2024-11-30'
    """))
    count_in_range = result.scalar()
    print(f"Rows in 2024-10-01 to 2024-11-30: {count_in_range}")

    # Check users
    result = conn.execute(text("SELECT COUNT(*) FROM users"))
    user_count = result.scalar()
    print(f"Users: {user_count} rows")
