
import sys
import os
from datetime import date
import traceback

# Add current directory to path
sys.path.append(os.getcwd())

from backend.api.dependencies import SessionLocal
from backend.api.services.metrics_service import MetricsService

def repro():
    db = SessionLocal()
    service = MetricsService(db)
    try:
        start_date = date(2024, 10, 1)
        end_date = date(2024, 11, 30)
        compare_to_previous = True
        
        print(f"Calling get_overview_metrics with: {start_date} to {end_date}, compare={compare_to_previous}")
        result = service.get_overview_metrics(
            start_date=start_date,
            end_date=end_date,
            compare_to_previous=compare_to_previous
        )
        print("Success!")
        print(result)
    except Exception as e:
        print("Caught Exception:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    repro()
