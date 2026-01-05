
import sys
import os
from datetime import date

# Add current directory to path
sys.path.append(os.getcwd())

from backend.api.dependencies import SessionLocal
from backend.api.repositories.metrics_repository import MetricsRepository

def debug_query():
    db = SessionLocal()
    repo = MetricsRepository(db)
    try:
        start_date = date(2025, 12, 1)
        end_date = date(2025, 12, 31)
        print(f"Executing query for {start_date} to {end_date}...")
        
        # Build status filter
        status_filter = ""
        account_filter = ""
        
        from sqlalchemy import text
        query = text(f"""
            SELECT
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.leads) as leads
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
        """)
        
        params = {'start_date': start_date, 'end_date': end_date}
        result = db.execute(query, params).fetchone()
        
        print(f"Result type: {type(result)}")
        print(f"Result keys: {result.keys() if hasattr(result, 'keys') else 'No keys'}")
        print(f"Result values: {result}")
        
        try:
            print(f"Accessing .spend: {result.spend}")
            print(f"Accessing .leads: {result.leads}")
        except Exception as e:
            print(f"Error accessing attributes: {e}")
            
        try:
            mapping = result._mapping
            print(f"Accessing via mapping['leads']: {mapping['leads']}")
        except Exception as e:
            print(f"Error accessing mapping: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    debug_query()
