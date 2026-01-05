"""
database_testing.py - Extreme Database Diagnostic Suite
Focus: Full-funnel join testing (Demographics, Placements, Status, Metrics)
"""

from sqlalchemy import text
from sqlalchemy.orm import Session
import logging
import pandas as pd

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatabaseTester:
    def __init__(self, engine=None):
        if engine is None:
            from backend.utils.db_utils import get_db_engine
            self.engine = get_db_engine()
        else:
            self.engine = engine

    def run_all_tests(self):
        print("\n" + "█"*100)
        print("  EXTREME DATABASE JOIN & INTEGRITY DIAGNOSTIC  ".center(100, "█"))
        print("█"*100 + "\n")

        with Session(self.engine) as session:
            print("🔍 STEP 1: DIMENSION COUNT CHECK")
            self._check_counts(session)
            
            print("\n🔍 STEP 2: RUNNING EXTREME CROSS-DIMENSION JOIN")
            self.run_extreme_join_test(session)
            
            print("\n🔍 STEP 3: DATA INTEGRITY (NULL/UNKNOWN DETECTION)")
            self._check_integrity(session)

    def _check_counts(self, session):
        tables = ['dim_account', 'dim_campaign', 'dim_adset', 'dim_ad', 'dim_gender', 'dim_age', 'dim_placement']
        for t in tables:
            try:
                count = session.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                print(f"  {t:<20}: {count} rows")
            except Exception:
                session.rollback()
                print(f"  ❌ {t:<20}: Table missing or error")

    def run_extreme_join_test(self, session):
        """
        שאילתה שמחברת את הכל: 
        Core Metrics + Campaign Meta + Adset Meta + Gender + Age
        """
        query = text('''
            SELECT 
                d.date,
                acc.account_name,
                c.campaign_name,
                c.objective,
                c.campaign_status,
                ads.adset_name,
                ads.adset_status,
                ad.ad_name,
                g.gender,
                age.age_group,
                f.spend,
                f.impressions,
                f.clicks
            FROM fact_age_gender_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_account acc ON f.account_id = acc.account_id
            JOIN dim_campaign c ON f.campaign_id = c.campaign_id
            JOIN dim_adset ads ON f.adset_id = ads.adset_id
            JOIN dim_ad ad ON f.ad_id = ad.ad_id
            JOIN dim_gender g ON f.gender_id = g.gender_id
            JOIN dim_age age ON f.age_id = age.age_id
            WHERE f.spend >= 0
            ORDER BY f.spend DESC
            LIMIT 10
        ''')
        
        try:
            result = session.execute(query).fetchall()
            if not result:
                print("  ⚠️ ZERO ROWS RETURNED. This means the joins are failing (check Foreign Keys).")
                return

            # הדפסה בפורמט טבלאי נקי
            df = pd.DataFrame([dict(row._mapping) for row in result])
            print("\n--- SAMPLE DATA FROM EXTREME JOIN ---")
            print(df.to_string(index=False))
            
        except Exception as e:
            print(f"  ❌ Extreme Join Failed: {str(e)[:100]}")
            session.rollback()

    def _check_integrity(self, session):
        """בדיקה ממוקדת על מה שחסר"""
        checks = {
            "Campaigns with 'Unknown' name": "SELECT COUNT(*) FROM dim_campaign WHERE campaign_name LIKE 'Unknown%'",
            "Ads with NULL creative": "SELECT COUNT(*) FROM dim_ad WHERE creative_id IS NULL",
            "Fact rows with 0 impressions": "SELECT COUNT(*) FROM fact_core_metrics WHERE impressions = 0",
            "Fact rows with 0 clicks (and spend > 0)": "SELECT COUNT(*) FROM fact_core_metrics WHERE clicks = 0 AND spend > 0"
        }
        
        for label, sql in checks.items():
            try:
                res = session.execute(text(sql)).scalar()
                status = "🚩 ISSUE" if res > 0 else "✅ OK"
                print(f"  {status} | {label}: {res}")
            except Exception:
                session.rollback()

if __name__ == "__main__":
    from backend.utils.db_utils import get_db_engine
    tester = DatabaseTester(get_db_engine())
    tester.run_all_tests()