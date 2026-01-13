
import pandas as pd
import sys
import os

# Add background to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.transformers.dimension_builder import _extract_dim_adset

def test_logic():
    test_data = [
        # Broad
        {
            'adset_id': '1', 
            'adset_name': 'Broad Test',
            'targeting': {'geo_locations': {'countries': ['BR']}, 'age_min': 18}
        },
        # Lookalike
        {
            'adset_id': '2',
            'adset_name': 'Lookalike Test',
            'targeting': {
                'custom_audiences': [{'name': 'Lookalike (BR, 1%) - Visitors', 'id': '101'}]
            }
        },
        # Remarketing
        {
            'adset_id': '3',
            'adset_name': 'Remarketing Test',
            'targeting': {
                'custom_audiences': [{'name': 'All Visitors 30d', 'id': '102'}]
            }
        },
        # List Audience
        {
            'adset_id': '4',
            'adset_name': 'List Test',
            'targeting': {
                'custom_audiences': [{'name': 'CRM_Customers_List_2023', 'id': '103'}]
            }
        },
        # Interest Audience
        {
            'adset_id': '5',
            'adset_name': 'Interest Test',
            'targeting': {
                'flexible_spec': [{'interests': [{'name': 'Hiking', 'id': '201'}]}]
            }
        },
        # Mix Audience
        {
            'adset_id': '6',
            'adset_name': 'Mix Test',
            'targeting': {
                'custom_audiences': [{'name': 'All Visitors 30d', 'id': '102'}],
                'flexible_spec': [{'interests': [{'name': 'Hiking', 'id': '201'}]}]
            }
        }
    ]
    
    df = pd.DataFrame(test_data)
    df['campaign_id'] = 'camp_1'
    
    df_dim = _extract_dim_adset(df)
    
    print("\nTargeting Classification Results:")
    print(df_dim[['adset_name', 'targeting_type', 'targeting_summary']].to_string())

if __name__ == "__main__":
    test_logic()
