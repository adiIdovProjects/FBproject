"""
Test script for proactive insights generation
"""

import sys
import os
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config.base_config import Settings
from api.services.proactive_analysis_service import ProactiveAnalysisService

def test_daily_insights():
    print("=" * 70)
    print("Testing Daily Insights Generation")
    print("=" * 70)

    settings = Settings()
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        service = ProactiveAnalysisService(db)

        print("\n1. Generating daily insights...")
        insights = service.generate_daily_insights(account_id=None)

        if insights:
            print(f"\n✅ Generated {len(insights)} insight(s)")
            for insight in insights:
                print(f"\n{'='*70}")
                print(f"Priority: {insight['priority'].upper()}")
                print(f"Title: {insight['title']}")
                print(f"\nMessage:")
                print(insight['message'])
                print('='*70)
        else:
            print("\n⚠️ No insights generated (may be no data or Gemini API not configured)")

        # Test retrieval
        print("\n\n2. Testing insight retrieval...")
        stored_insights = service.get_latest_insights(limit=5)

        if stored_insights:
            print(f"\n✅ Found {len(stored_insights)} stored insight(s)")
            for insight in stored_insights:
                print(f"\n- [{insight['priority'].upper()}] {insight['title']}")
                print(f"  Generated: {insight['generated_at']}")
                print(f"  Read: {insight['is_read']}")
        else:
            print("\n⚠️ No stored insights found in database")

        print("\n" + "=" * 70)
        print("✅ TEST COMPLETED")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ Error during test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        engine.dispose()


if __name__ == "__main__":
    test_daily_insights()
