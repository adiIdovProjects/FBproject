import sys
import os
from sqlalchemy import text

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from utils.db_utils import get_db_engine

def apply_indices():
    engine = get_db_engine()
    
    indices = [
        # FactCoreMetrics
        "CREATE INDEX IF NOT EXISTS idx_fact_core_adset ON fact_core_metrics (adset_id)",
        "CREATE INDEX IF NOT EXISTS idx_fact_core_ad ON fact_core_metrics (ad_id)",
        "CREATE INDEX IF NOT EXISTS idx_fact_core_creative ON fact_core_metrics (creative_id)",
        
        # FactPlacementMetrics
        "CREATE INDEX IF NOT EXISTS idx_fact_placement_date ON fact_placement_metrics (date_id)",
        "CREATE INDEX IF NOT EXISTS idx_fact_placement_campaign ON fact_placement_metrics (campaign_id)",
        
        # FactAgeGenderMetrics
        "CREATE INDEX IF NOT EXISTS idx_fact_age_gender_date ON fact_age_gender_metrics (date_id)",
        "CREATE INDEX IF NOT EXISTS idx_fact_age_gender_campaign ON fact_age_gender_metrics (campaign_id)",
        
        # FactCountryMetrics
        "CREATE INDEX IF NOT EXISTS idx_fact_country_date ON fact_country_metrics (date_id)",
        "CREATE INDEX IF NOT EXISTS idx_fact_country_campaign ON fact_country_metrics (campaign_id)",
    ]
    
    with engine.begin() as conn:
        for idx_sql in indices:
            try:
                conn.execute(text(idx_sql))
                print(f"SUCCESS: Executed: {idx_sql}")
            except Exception as e:
                print(f"ERROR: Error executing {idx_sql}: {e}")

if __name__ == "__main__":
    apply_indices()
