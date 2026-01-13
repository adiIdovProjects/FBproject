import pandas as pd
from utils.db_utils import get_db_engine
import logging

logging.basicConfig(level=logging.INFO)

def check_israel():
    engine = get_db_engine()
    from sqlalchemy import text
    with engine.connect() as conn:
        query = text("SELECT count(*) FROM fact_country_metrics WHERE country_id = 3")
        count = conn.execute(query).fetchone()[0]
        print(f"Rows with Country ID 3 (Israel): {count}")
        
        query_all = text("SELECT count(*) FROM fact_country_metrics")
        total = conn.execute(query_all).fetchone()[0]
        print(f"Total rows in fact_country_metrics: {total}")

if __name__ == "__main__":
    check_israel()
