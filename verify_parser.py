
import sys
import os
import json
import pandas as pd

# Add project root to path
sys.path.append(os.getcwd())

from backend.transformers.action_parser import parse_actions_from_row

def test_parser():
    print("Testing Action Parser...")
    
    # Mock Row Data
    mock_row = {
        'date_id': '2023-01-01',
        'account_id': '123',
        'campaign_id': '456',
        'actions': [
            {'action_type': 'purchase', 'value': '10'},                 # Tracked
            {'action_type': 'comment', 'value': '5'},                   # Ignored
            {'action_type': 'custom_submit_application', 'value': '2'}  # New / Unknown
        ],
        'action_values': []
    }
    
    # Run Parser
    results = parse_actions_from_row(mock_row)
    
    # Analyze Results
    parsed_types = [r['action_type'] for r in results]
    print(f"Parsed Types: {parsed_types}")
    
    # Assertions
    if 'purchase' in parsed_types:
        print("✅ 'purchase' was correctly parsed.")
    else:
        print("❌ 'purchase' was missed!")
        
    if 'comment' not in parsed_types:
        print("✅ 'comment' was correctly ignored.")
    else:
        print("❌ 'comment' was NOT ignored!")
        
    if 'custom_submit_application' in parsed_types:
        print("✅ 'custom_submit_application' was correctly parsed (Dynamic Discovery).")
    else:
        print("❌ 'custom_submit_application' was missed!")

if __name__ == "__main__":
    test_parser()
