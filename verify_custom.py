
import sys
import os
from backend.transformers.action_parser import parse_actions_from_row

def test_parser_custom():
    print("Testing Action Parser for Custom Events...")
    
    mock_row = {
        'date_id': '2023-01-01',
        'account_id': '123',
        'campaign_id': '456',
        'actions': [
            {'action_type': 'newsletter_signup', 'value': '1'}
        ],
        'action_values': []
    }
    
    results = parse_actions_from_row(mock_row)
    parsed_types = [r['action_type'] for r in results]
    print(f"Parsed Types: {parsed_types}")
    
    if 'newsletter_signup' in parsed_types:
        print("✅ 'newsletter_signup' was correctly parsed as-is.")
    else:
        print(f"❌ 'newsletter_signup' was changed to {parsed_types[0] if parsed_types else 'Nothing'}!")

if __name__ == "__main__":
    test_parser_custom()
