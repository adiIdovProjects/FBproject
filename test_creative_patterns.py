"""
Test creative pattern detection and analysis
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config.base_config import Settings
from backend.api.repositories.creative_analysis_repository import CreativeAnalysisRepository
from backend.utils.creative_pattern_detector import CreativePatternDetector

settings = Settings()
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def test_creative_patterns():
    print("=" * 70)
    print("Testing Creative Pattern Detection & Analysis")
    print("=" * 70)

    db = SessionLocal()
    repo = CreativeAnalysisRepository(db)
    detector = CreativePatternDetector()

    try:
        # Test 1: Get creative performance
        end_date = date.today()
        start_date = end_date - timedelta(days=30)

        print(f"\n1. Testing get_creative_performance({start_date} to {end_date})...")
        creatives = repo.get_creative_performance(
            start_date=start_date,
            end_date=end_date,
            min_impressions=100  # Low threshold for testing
        )
        print(f"   Result: {len(creatives)} creatives with >100 impressions")

        if creatives:
            top_creative = creatives[0]
            print(f"\n   Top performing creative:")
            print(f"   - ID: {top_creative['creative_id']}")
            print(f"   - Title: {top_creative['title'][:80] if top_creative['title'] else 'No title'}")
            print(f"   - CTA: {top_creative['call_to_action_type']}")
            print(f"   - ROAS: {top_creative['roas']:.2f}x")
            print(f"   - CTR: {top_creative['ctr']:.2f}%")
            print(f"   - Conversions: {top_creative['conversions']}")

            # Test 2: Pattern detection on top creative
            print(f"\n2. Testing pattern detection on top creative...")
            classification = detector.classify_creative(top_creative)
            print(f"   Detected themes: {classification['themes']}")
            print(f"   Primary theme: {classification['primary_theme']}")
            print(f"   Word count: {classification['word_count']}")
            print(f"   Has question: {classification['has_question']}")
            print(f"   Has numbers: {classification['has_numbers']}")

        # Test 3: Theme performance analysis
        print(f"\n3. Testing theme performance analysis...")
        if creatives:
            theme_stats = detector.analyze_theme_performance(creatives)
            print(f"   Themes found: {len(theme_stats)}")

            # Sort by ROAS
            sorted_themes = sorted(
                theme_stats.items(),
                key=lambda x: x[1]['overall_roas'],
                reverse=True
            )

            print(f"\n   Top 5 themes by ROAS:")
            for theme, stats in sorted_themes[:5]:
                print(f"   - {theme:20s}: "
                      f"ROAS {stats['overall_roas']:.2f}x, "
                      f"{stats['creative_count']} creatives, "
                      f"{stats['total_conversions']} conversions")

        # Test 4: CTA effectiveness
        print(f"\n4. Testing CTA effectiveness analysis...")
        cta_performance = repo.get_cta_effectiveness(
            start_date=start_date,
            end_date=end_date,
            min_creatives=1  # Low threshold for testing
        )
        print(f"   Result: {len(cta_performance)} CTA types analyzed")

        if cta_performance:
            print(f"\n   CTA Performance:")
            for cta in cta_performance[:5]:
                print(f"   - {cta['cta_type']:20s}: "
                      f"ROAS {cta['avg_roas']:.2f}x, "
                      f"CTR {cta['avg_ctr']:.2f}%, "
                      f"{cta['creative_count']} creatives")

        # Test 5: Winning patterns
        print(f"\n5. Testing winning patterns identification...")
        if creatives:
            winning = detector.identify_winning_patterns(
                creatives=creatives,
                min_roas=0.5,  # Low threshold for testing
                min_conversions=1
            )

            print(f"   High ROAS creatives: {len(winning['high_roas_creatives'])}")
            print(f"   Common themes among winners: {len(winning['common_themes'])}")

            if winning['common_themes']:
                print(f"\n   Most common themes in winners:")
                for theme_info in winning['common_themes'][:5]:
                    print(f"   - {theme_info['theme']}: appears {theme_info['count']} times")

        # Test 6: Fatigue detection
        print(f"\n6. Testing creative fatigue detection...")
        fatigued = repo.get_fatigued_creatives(
            lookback_days=30,
            fatigue_threshold=-15.0,  # More sensitive for testing
            min_impressions=1000
        )
        print(f"   Result: {len(fatigued)} fatigued creatives found")

        if fatigued:
            print(f"\n   Most fatigued creative:")
            worst = fatigued[0]
            print(f"   - ID: {worst['creative_id']}")
            print(f"   - Title: {worst['title'][:80] if worst['title'] else 'No title'}")
            print(f"   - Initial CTR: {worst['initial_ctr']:.2f}%")
            print(f"   - Recent CTR: {worst['recent_ctr']:.2f}%")
            print(f"   - Fatigue: {worst['fatigue_pct']:.1f}%")

        print("\n" + "=" * 70)
        print("✅ PHASE 2 CREATIVE PATTERN TESTS: SUCCESS!")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ Error during test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_creative_patterns()
