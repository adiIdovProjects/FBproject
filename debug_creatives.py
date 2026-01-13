import sys
import os
from datetime import date, timedelta
import traceback

# Add current dir to path
sys.path.append(os.getcwd())

from backend.api.dependencies import SessionLocal
from backend.api.services.metrics_service import MetricsService
from backend.models.user_schema import User

def main():
    db = SessionLocal()
    try:
        # Get first user
        user = db.query(User).first()
        if not user:
            print("No users found")
            return
        
        print(f"Using user: {user.id}")
        
        service = MetricsService(db, user_id=user.id)
        
        # Simulating request params - 30 days lookback
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        print(f"Calling get_creative_metrics for {start_date} to {end_date}...")
        metrics = service.get_creative_metrics(
            start_date=start_date,
            end_date=end_date
        )
        print(f"Success! Got {len(metrics)} metrics")
        
    except Exception as e:
        print("\nEXCEPTION CAUGHT:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
