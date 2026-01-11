
import sys
import os
from datetime import date
import traceback
from backend.api.schemas.responses import AgeGenderBreakdown

# Add current directory to path
sys.path.append(os.getcwd())

from backend.api.dependencies import SessionLocal
from backend.api.services.metrics_service import MetricsService

def test_validation():
    db = SessionLocal()
    service = MetricsService(db, user_id=1)
    
    start_date = date(2025, 1, 1)
    end_date = date(2025, 1, 1)

    try:
        print("Fetching data from service...")
        results = service.get_age_gender_breakdown(
            start_date=start_date,
            end_date=end_date,
            group_by='both',
            account_ids=[1]
        )
        print(f"Got {len(results)} results from service.")
        
        print("Validating against Pydantic model...")
        for i, item in enumerate(results):
            # MetricsService returns strict AgeGenderBreakdown objects, 
            # so this check is redundant in Python unless simple internal dicts were returned.
            # However, if it returns dicts (it shouldn't based on my view), this will convert them.
            # If it returns Objects, we dump and re-validate.
            
            # Simulate FastAPI serialization
            item_dict = item.dict()
            validated = AgeGenderBreakdown(**item_dict)
            print(f"Item {i} validated successfully.")

    except Exception as e:
        print("Validation FAILED:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_validation()
