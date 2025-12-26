
import sys
import os
from datetime import date
from typing import List

# Mock database session
class MockDB:
    def execute(self, query, params=None):
        return self

    def fetchall(self):
        return []
    
    def fetchone(self):
        return None
    
    def close(self):
        pass

# Add backend to path
sys.path.append(os.path.abspath('backend'))

try:
    from api.dependencies import SessionLocal
    from api.services.metrics_service import MetricsService
    from api.schemas.requests import CampaignStatus
    
    print("Imports successful")

    db = SessionLocal()
    service = MetricsService(db)

    print("--- Testing get_campaign_comparison ---")
    
    # Test cases
    cases = [
        # Basic
        {'start_date': date(2024, 10, 1), 'end_date': date(2024, 11, 30), 'name': 'Basic'},
        # Empty
        {'start_date': date(2025, 10, 1), 'end_date': date(2025, 11, 30), 'name': 'Empty'},
        # Single Day
        {'start_date': date(2024, 10, 30), 'end_date': date(2024, 10, 30), 'name': 'Single Day'},
        # With Status
        {'start_date': date(2024, 10, 1), 'end_date': date(2024, 11, 30), 'status': ['ACTIVE'], 'name': 'With Status'},
        # With Sort ROAS
        {'start_date': date(2024, 10, 1), 'end_date': date(2024, 11, 30), 'sort_by': 'roas', 'name': 'Sort ROAS'},
    ]

    for case in cases:
        print(f"\nRunning case: {case['name']}")
        try:
            kwargs = {k:v for k,v in case.items() if k != 'name'}
            if 'status' in kwargs:
                kwargs['campaign_status'] = kwargs.pop('status')
            
            # Call service directly
            results = service.get_campaign_comparison(**kwargs)
            print(f"Success! Got {len(results)} items")
            if results:
                print(f"Sample item: {results[0]}")
        except Exception as e:
            print(f"FAILED with error: {e}")
            import traceback
            traceback.print_exc()

    db.close()

except ImportError as e:
    print(f"Import Error: {e}")
except Exception as e:
    print(f"General Error: {e}")
    import traceback
    traceback.print_exc()
