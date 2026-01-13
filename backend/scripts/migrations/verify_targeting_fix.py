import os
import pandas as pd
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adset import AdSet
from dotenv import load_dotenv
import logging

# Set up logging to see what's happening
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VerifyTargeting")

# Import our project tools
import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.transformers.core_transformer import clean_and_transform
from backend.transformers.dimension_builder import extract_dimensions

def verify_fix():
    load_dotenv()
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
    account_id = os.getenv("FACEBOOK_AD_ACCOUNT_ID")
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    account = AdAccount(f'act_{account_id}')
    
    print("\n--- STEP 1: Fetching Raw AdSets from API ---")
    # Fetch a few adsets with their targeting
    adsets = account.get_ad_sets(fields=[
        AdSet.Field.id,
        AdSet.Field.name,
        AdSet.Field.targeting,
        'status',
        'campaign_id'
    ], params={'limit': 5})
    
    raw_adset_data = [a.export_all_data() for a in adsets]
    df_metadata = pd.DataFrame(raw_adset_data)
    # Rename id to adset_id for our logic
    df_metadata.rename(columns={'id': 'adset_id'}, inplace=True)
    
    print(f"Fetched {len(df_metadata)} adsets.")
    
    # Step 2: Create "dummy" fact data that would normally come from insights
    # This simulates the fact that we have stats for these adsets
    df_facts = pd.DataFrame([
        {
            'date_start': '2023-10-25',
            'adset_id': row['adset_id'],
            'campaign_id': row.get('campaign_id', '0'),
            'ad_id': '0',
            'creative_id': '0',
            'account_id': account_id,
            'spend': 100,
            'impressions': 1000,
            'clicks': 50
        } for _, row in df_metadata.iterrows()
    ])
    
    print("\n--- STEP 2: Running CoreTransformer (Merging Metadata) ---")
    # This tests the fix in core_transformer.py (the merge logic)
    df_transformed = clean_and_transform(df_facts, df_metadata)
    
    print("\n--- STEP 3: Running Dimension Extraction ---")
    # This tests the fix in dimension_builder.py (the classification logic)
    dims = extract_dimensions(df_transformed)
    df_dim_adset = dims.get('dim_adset', pd.DataFrame())
    
    print("\n--- FINAL RESULTS ---")
    if not df_dim_adset.empty:
        cols = ['adset_name', 'targeting_type', 'targeting_summary']
        print(df_dim_adset[cols].to_string(index=False))
    else:
        print("Error: No adset dimension data extracted.")

if __name__ == "__main__":
    verify_fix()
