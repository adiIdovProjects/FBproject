import sys
import os
from datetime import date
from unittest.mock import MagicMock

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.api.services.insights_service import InsightsService

def test_prepare_data_summary_with_comparison():
    # Mock DB session
    db_mock = MagicMock()
    
    # Initialize service
    service = InsightsService(db_mock)
    
    # Mock data with current and previous periods
    data = {
        'period': '2023-12-01 to 2023-12-30',
        'prev_period': '2023-11-01 to 2023-11-30',
        'overview': {
            'spend': 1000.0,
            'impressions': 100000,
            'clicks': 1000,
            'conversions': 50,
            'conversion_value': 5000.0
        },
        'prev_overview': {
            'spend': 800.0,
            'impressions': 80000,
            'clicks': 800,
            'conversions': 40,
            'conversion_value': 4000.0
        },
        'campaigns': []
    }
    
    # Run data preparation
    summary = service._prepare_data_summary(data, detailed=False)
    
    print("\n--- Prepared Data Summary for AI ---")
    print(summary)
    
    # Assertions
    assert "CORE METRICS COMPARISON:" in summary
    assert "| Spend | $800.00 | $1000.00 | +25.0% |" in summary
    assert "| CTR | 1.00% | 1.00% | +0.0% |" in summary
    assert "| CPC | $1.00 | $1.00 | +0.0% |" in summary
    assert "| CPM | $10.00 | $10.00 | +0.0% |" in summary
    assert "| Conversions | 40 | 50 | +25.0% |" in summary
    
    print("\nVerification Successful: Comparison data correctly generated.")

if __name__ == "__main__":
    try:
        test_prepare_data_summary_with_comparison()
    except Exception as e:
        print(f"\nVerification Failed: {e}")
        sys.exit(1)
