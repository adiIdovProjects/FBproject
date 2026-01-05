"""
Test historical repository queries directly
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from backend.config.base_config import Settings
from backend.api.repositories.historical_repository import HistoricalRepository

settings = Settings()
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def test_historical_queries():
    print("=" * 60)
    print("Testing Historical Repository Queries")
    print("=" * 60)

    db = SessionLocal()
    repo = HistoricalRepository(db)

    try:
        # Test 1: Weekly trends
        print("\n1. Testing get_weekly_trends(lookback_days=90)...")
        weekly_data = repo.get_weekly_trends(lookback_days=90)
        print(f"   Result: {len(weekly_data)} weeks of data")

        if weekly_data:
            latest_week = weekly_data[-1]
            print(f"\n   Latest week ({latest_week['week_start']}):")
            print(f"   - Spend: ${latest_week['spend']:.2f}")
            print(f"   - Conversions: {latest_week['conversions']}")
            print(f"   - CTR: {latest_week['ctr']:.2f}%")
            print(f"   - ROAS: {latest_week['roas']:.2f}x")
            print(f"   - WoW Conversion Change: {latest_week['wow_conversions_change_pct']:.1f}%")

        # Test 2: Daily seasonality
        print("\n2. Testing get_daily_seasonality(lookback_days=90)...")
        seasonality_data = repo.get_daily_seasonality(lookback_days=90)
        print(f"   Result: {len(seasonality_data)} days of week analyzed")

        if seasonality_data:
            print("\n   Day-of-week performance:")
            for day in seasonality_data:
                print(f"   - {day['day_of_week']:10s}: "
                      f"{day['avg_daily_conversions']:.1f} convs, "
                      f"CTR {day['avg_ctr']:.2f}%, "
                      f"ROAS {day['avg_roas']:.2f}x "
                      f"(sample: {day['sample_size']} days)")

        # Test 3: Campaign trend history (if campaigns exist)
        print("\n3. Testing get_campaign_trend_history...")
        # Get a campaign ID first
        result = db.execute(text("SELECT campaign_id FROM dim_campaign LIMIT 1"))
        campaign_row = result.fetchone()

        if campaign_row:
            campaign_id = campaign_row[0]
            print(f"   Using campaign_id: {campaign_id}")

            history = repo.get_campaign_trend_history(campaign_id=campaign_id, lookback_days=30)
            print(f"   Result: {len(history)} days of history")

            if history:
                latest = history[-1]
                print(f"\n   Latest day ({latest['date']}):")
                print(f"   - CTR: {latest['ctr']:.2f}% (7-day avg: {latest['ctr_7day_avg']:.2f}%)")
                print(f"   - ROAS: {latest['roas']:.2f}x (7-day avg: {latest['roas_7day_avg']:.2f}x)")
                print(f"   - Conversions 7-day avg: {latest['conversions_7day_avg']:.1f}")
        else:
            print("   No campaigns found in database")

        print("\n" + "=" * 60)
        print("✅ PHASE 1 REPOSITORY TESTS: SUCCESS!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error during test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_historical_queries()
