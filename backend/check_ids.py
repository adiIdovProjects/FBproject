
import os
import pandas as pd
from datetime import date
from dotenv import load_dotenv
load_dotenv()

from extractors.fb_api import FacebookExtractor
from transformers.core_transformer import CoreTransformer

def check_ids():
    ext = FacebookExtractor()
    if not ext.initialize():
        print("Failed to init")
        return

    # Fetch real data for one day
    start_date = date(2024, 9, 29)
    end_date = date(2024, 9, 29)
    
    print("Fetching core data...")
    df_core = ext.get_core_data(start_date, end_date)
    print(f"Core rows: {len(df_core)}")
    if not df_core.empty:
        orig_id_str = str(df_core['ad_id'].iloc[0])
        print(f"Original ID String: {orig_id_str}")
        
        # Run transformation
        transformer = CoreTransformer()
        df_transformed = transformer.transform(df_core)
        
        transformed_id = df_transformed['ad_id'].iloc[0]
        transformed_id_str = str(transformed_id)
        print(f"Transformed ID: {transformed_id} (Type: {type(transformed_id)})")
        
        if orig_id_str == transformed_id_str:
            print("✅ Precision maintained!")
        else:
            print(f"❌ PRECISION LOSS: {orig_id_str} became {transformed_id_str}")
    
    print("\nFetching metadata...")
    df_meta = ext.get_metadata(df_core)
    print(f"Meta rows: {len(df_meta)}")
    
    if not df_meta.empty:
        # Check if ad_id in core matches ad_id in meta
        core_ad_ids = set(df_core['ad_id'].astype(str).tolist())
        meta_ad_ids = set(df_meta[df_meta['ad_id'].notna()]['ad_id'].astype(str).tolist())
        
        common = core_ad_ids.intersection(meta_ad_ids)
        print(f"\nCommon Ad IDs: {len(common)} / {len(core_ad_ids)}")
        
        sample_meta_ad = df_meta[df_meta['ad_id'].notna()].iloc[0]
        print("\nSample Meta Ad row:")
        print(sample_meta_ad[['ad_id', 'creative_id']] if 'creative_id' in sample_meta_ad else sample_meta_ad[['ad_id']])
        
        if 'creative_id' in df_meta.columns:
            print("\nUnique Creative IDs in Meta:", df_meta['creative_id'].nunique())
            print("Sample Creative IDs in Meta:", df_meta['creative_id'].dropna().unique()[:5])
        
        # Test direct lookup for one core ID
        core_ad_id = df_core['ad_id'].iloc[0]
        print(f"\nTesting direct lookup for Ad ID: {core_ad_id}")
        try:
            from facebook_business.adobjects.ad import Ad
            ad = Ad(str(core_ad_id))
            data = ad.api_get(fields=['id', 'name', 'account_id'])
            print(f"Direct Lookup Success: {data}")
        except Exception as e:
            print(f"Direct Lookup Failed: {e}")

if __name__ == "__main__":
    check_ids()
