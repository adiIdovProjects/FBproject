
import sys
import os
from datetime import date
import traceback
from sqlalchemy import text

# Add current directory to path
sys.path.append(os.getcwd())

from backend.api.dependencies import SessionLocal
from backend.api.services.metrics_service import MetricsService
from backend.utils.db_utils import get_db_engine

def diagnose():
    db = SessionLocal()
    # Ensure User 1 exists and has access (already done by previous script, but safe to assume)
    service = MetricsService(db, user_id=1)
    
    start_date = date(2025, 1, 1)
    end_date = date(2025, 1, 1)

    scenarios = [
        {"name": "Group By Both, Explicit Account", "kwargs": {"group_by": "both", "account_ids": [1]}},
        {"name": "Group By Age, Explicit Account", "kwargs": {"group_by": "age", "account_ids": [1]}},
        {"name": "Group By Gender, Explicit Account", "kwargs": {"group_by": "gender", "account_ids": [1]}},
        {"name": "Group By Both, None Account (All User Accounts)", "kwargs": {"group_by": "both", "account_ids": None}},
        {"name": "Group By Both, Empty Account (Should return [])", "kwargs": {"group_by": "both", "account_ids": []}},
        {"name": "Group By Both, None Status", "kwargs": {"group_by": "both", "account_ids": [1], "campaign_status": None}},
        {"name": "Group By Both, Empty Status", "kwargs": {"group_by": "both", "account_ids": [1], "campaign_status": []}},
        {"name": "Group By Both, 'ALL' Status", "kwargs": {"group_by": "both", "account_ids": [1], "campaign_status": ['ALL']}},
        {"name": "Group By Both, Search Query None", "kwargs": {"group_by": "both", "account_ids": [1], "search_query": None}},
        {"name": "Group By Both, Search Query Empty", "kwargs": {"group_by": "both", "account_ids": [1], "search_query": ""}},
    ]

    for scenario in scenarios:
        print(f"\n--- Testing Scenario: {scenario['name']} ---")
        try:
            result = service.get_age_gender_breakdown(
                start_date=start_date,
                end_date=end_date,
                **scenario['kwargs']
            )
            print(f"Success. Result count: {len(result)}")
        except Exception as e:
            print(f"FAILED scenario '{scenario['name']}':")
            traceback.print_exc()

    db.close()

if __name__ == "__main__":
    diagnose()
