
import os
import sys
import logging
from datetime import date, timedelta
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from utils.db_utils import get_db_engine
from api.services.metrics_service import MetricsService

load_dotenv()

def verify_db_metrics():
    engine = get_db_engine()
    with Session(engine) as db:
        service = MetricsService(db)
        
        # Check last 7 days
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        print(f"Checking creative metrics for {start_date} to {end_date}...")
        
        creatives = service.get_creative_metrics(start_date, end_date, min_spend=0)
        
        if not creatives:
            print("No creatives found.")
            return

        print(f"Found {len(creatives)} creatives.")
        
        video_creatives = [c for c in creatives if c.is_video]
        print(f"Found {len(video_creatives)} video creatives.")

        for metrics in video_creatives:
            print(f"--- Creative: {metrics.title} ({metrics.creative_id}) ---")
            print(f"  Spend: {metrics.spend}")
            print(f"  Plays: {metrics.video_plays}")
            print(f"  Hook Rate: {metrics.hook_rate}%")
            print(f"  Hold Rate: {metrics.hold_rate}%")
            print(f"  Completion Rate: {metrics.completion_rate}%")
            print(f"  Avg Watch Time: {metrics.avg_watch_time}s")
            
            if metrics.video_plays > 0:
                print(f"  ✅ SUCCESS: Video plays are yielding metrics!")

if __name__ == "__main__":
    verify_db_metrics()
