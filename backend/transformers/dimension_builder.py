"""
transformers/dimension_builder.py - Extract dimension members from fact data
"""

import pandas as pd
import numpy as np
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

from backend.config.settings import UNKNOWN_MEMBER_ID, MISSING_DIM_VALUE
    
from backend.utils.mapping_utils import map_country_code, get_country_code


def extract_dimensions(df_facts: pd.DataFrame, df_actions: Optional[pd.DataFrame] = None, df_creatives: Optional[pd.DataFrame] = None, account_info: Optional[Dict] = None) -> Dict[str, pd.DataFrame]:
    """
    Extract all dimension members from fact data

    Args:
        df_facts: Cleaned fact DataFrame
        df_actions: Optional DataFrame with action data
        df_creatives: Optional creative details DataFrame
        account_info: Optional account information from Facebook (includes currency)

    Returns:
        Dictionary with dimension table names as keys, DataFrames as values
    """

    if df_facts.empty and (df_actions is None or df_actions.empty):
        logger.warning("Input DataFrames are empty")
        return {}

    logger.info(f"Extracting dimensions from {len(df_facts)} fact rows")
    if df_creatives is not None:
        logger.info(f"Creative details DF size: {len(df_creatives)}")

    dimensions = {}

    # Entity dimensions (from fact data)
    dimensions['dim_account'] = _extract_dim_account(df_facts, account_info)
    dimensions['dim_campaign'] = _extract_dim_campaign(df_facts)
    dimensions['dim_adset'] = _extract_dim_adset(df_facts)
    dimensions['dim_ad'] = _extract_dim_ad(df_facts)
    dimensions['dim_creative'] = _extract_dim_creative(df_facts, df_creatives)
    
    # ... rest of the function (omitted for brevity, keeping it as is)
    # Attribute dimensions (from fact data)
    if 'country' in df_facts.columns:
        dimensions['dim_country'] = _extract_dim_country(df_facts)
    
    if 'placement_name' in df_facts.columns:
        dimensions['dim_placement'] = _extract_dim_placement(df_facts)
    
    # Action types (from actions dataframe)
    if df_actions is not None and not df_actions.empty and 'action_type' in df_actions.columns:
         dimensions['dim_action_type'] = _extract_dim_action_type(df_actions)
    
    # Log results
    for dim_name, df in dimensions.items():
        if not df.empty:
            logger.info(f"✅ Extracted {dim_name}: {len(df)} unique members")
        else:
            logger.warning(f"⚠️ Extracted 0 members for {dim_name}")
    
    return dimensions


def _extract_dim_action_type(df: pd.DataFrame) -> pd.DataFrame:
    """Extract unique action types"""
    
    if 'action_type' not in df.columns:
        return pd.DataFrame()
    
    # Get unique action types
    action_types = df['action_type'].unique()
    action_types = action_types[(action_types != 'unknown') & (action_types != '')]
    
    if len(action_types) == 0:
        return pd.DataFrame()
    
    df_dim = pd.DataFrame({'action_type': action_types})
    
    # Determine if conversion
    # Conversion types usually include purchase, lead, etc.
    # We can infer based on the name or use the config list
    conversion_keywords = [
        'purchase', 'lead_form', 'add_to_cart', 'initiate_checkout', 
        'complete_registration', 'schedule', 'appointment', 'contact', 
        'submit_application', 'start_trial'
    ]
    
    def is_conversion(action_type):
        return any(k in action_type.lower() for k in conversion_keywords)
        
    df_dim['is_conversion'] = df_dim['action_type'].apply(is_conversion)
    
    return df_dim.reset_index(drop=True)


def _extract_dim_account(df: pd.DataFrame, account_info: Optional[Dict] = None) -> pd.DataFrame:
    """
    Extract unique accounts

    Args:
        df: DataFrame with account data
        account_info: Optional dict with account info from Facebook API (includes currency)
    """

    if 'account_id' not in df.columns:
        return pd.DataFrame()

    cols = ['account_id']
    if 'account_name' in df.columns:
        cols.append('account_name')

    df_dim = df[cols].drop_duplicates(subset=['account_id'])

    # Filter out unknown members (they're loaded separately)
    df_dim = df_dim[df_dim['account_id'] != UNKNOWN_MEMBER_ID]

    # Use account info from Facebook API if available
    if account_info and account_info.get('account_id'):
        logger.info(f"Using account info from Facebook API: {account_info.get('account_name')} ({account_info.get('currency')})")

        # Create account dimension from API data
        df_dim = pd.DataFrame([{
            'account_id': account_info['account_id'],
            'account_name': account_info.get('account_name', str(account_info['account_id'])),
            'currency': account_info.get('currency', 'USD')
        }])
    else:
        # Fallback to extracting from fact data
        logger.warning("No account info from Facebook API, using default currency (USD)")

        # Add account_name if missing (use account_id as name)
        if 'account_name' not in df_dim.columns or df_dim['account_name'].isna().all():
            df_dim['account_name'] = df_dim['account_id'].astype(str)

        # Fill any remaining NaN account_names
        df_dim['account_name'].fillna(df_dim['account_id'].astype(str), inplace=True)

        # Add default currency if not present
        if 'currency' not in df_dim.columns:
            df_dim['currency'] = 'USD'

    return df_dim.reset_index(drop=True)


def _extract_dim_campaign(df: pd.DataFrame) -> pd.DataFrame:
    """Extract unique campaigns"""
    
    if 'campaign_id' not in df.columns:
        return pd.DataFrame()
    
    cols = ['campaign_id', 'account_id']
    optional_cols = ['campaign_name', 'objective', 'campaign_status']
    
    for col in optional_cols:
        if col in df.columns:
            cols.append(col)
    
    df_dim = df[cols].drop_duplicates(subset=['campaign_id'])
    df_dim = df_dim[df_dim['campaign_id'] != UNKNOWN_MEMBER_ID]
    
    # Ensure all required columns exist and fill missing values
    if 'campaign_name' not in df_dim.columns:
        df_dim['campaign_name'] = 'Unknown Campaign'
    else:
        df_dim['campaign_name'].fillna('Unknown Campaign', inplace=True)
        
    if 'objective' not in df_dim.columns:
        df_dim['objective'] = 'N/A'
    else:
        df_dim['objective'].fillna('N/A', inplace=True)
        
    if 'campaign_status' not in df_dim.columns:
        df_dim['campaign_status'] = 'UNKNOWN'
    else:
        df_dim['campaign_status'].fillna('UNKNOWN', inplace=True)
    
    return df_dim.reset_index(drop=True)


def _extract_dim_adset(df: pd.DataFrame) -> pd.DataFrame:
    """Extract unique adsets and parse targeting"""
    
    if 'adset_id' not in df.columns:
        return pd.DataFrame()
    
    cols = ['adset_id', 'campaign_id']
    optional_cols = ['adset_name', 'adset_status', 'targeting']
    
    for col in optional_cols:
        if col in df.columns:
            cols.append(col)
    
    df_dim = df[cols].drop_duplicates(subset=['adset_id'])
    df_dim = df_dim[df_dim['adset_id'] != UNKNOWN_MEMBER_ID]
    
    # Parse targeting
    df_dim['targeting_type'] = 'Broad'
    df_dim['targeting_summary'] = 'N/A'
    
    def parse_targeting(targeting):
        if not targeting or not isinstance(targeting, dict):
            return 'Broad', 'N/A'
        
        summary_parts = []
        has_custom = False
        has_lookalike = False
        has_interests = False
        is_list = False
        ca_names = []
        
        # 1. Analyze Custom Audiences
        if 'custom_audiences' in targeting:
            has_custom = True
            audiences = targeting['custom_audiences']
            for a in audiences:
                if not isinstance(a, dict): continue
                name = a.get('name', '')
                if not name: continue
                ca_names.append(name)
                if any(x in name.lower() for x in ['lookalike', 'semelhante', 'similar', 'lal', 'llook']):
                    has_lookalike = True
                if any(x in name.lower() for x in ['list', 'crm', 'email', 'customer', 'lista', 'db']):
                    is_list = True
            
            if has_lookalike:
                summary_parts.append(f"Lookalike: {', '.join(ca_names[:3])}")
            elif is_list:
                summary_parts.append(f"List: {', '.join(ca_names[:3])}")
            else:
                summary_parts.append(f"Custom/Retargeting: {', '.join(ca_names[:3])}")
        
        # 2. Analyze Interests / Behaviors
        interest_names = []
        if 'flexible_spec' in targeting:
            specs = targeting['flexible_spec']
            for spec in specs:
                for field in ['interests', 'behaviors', 'life_events']:
                    if field in spec:
                        interest_names.extend([i.get('name') for i in spec[field] if i.get('name')])
            
            if interest_names:
                has_interests = True
                summary_parts.append(f"Interests: {', '.join(interest_names[:5])}")

        # 3. Analyze Geo Locations
        geo = targeting.get('geo_locations', {})
        if geo:
            geo_parts = []
            if 'countries' in geo:
                geo_parts.extend(geo['countries'])
            if 'cities' in geo:
                geo_parts.extend([c.get('name') for c in geo['cities'] if c.get('name')])
            if 'custom_locations' in geo:
                geo_parts.extend([l.get('name') or 'Custom Location' for l in geo['custom_locations']])
            
            if geo_parts:
                summary_parts.append(f"Geo: {', '.join(geo_parts[:3])}")
        
        # 4. Determine Final Targeting Type
        if has_custom and has_interests:
            t_type = 'Mix Audience'
        elif has_lookalike:
            t_type = 'Lookalike'
        elif is_list:
            t_type = 'List Audience'
        elif has_custom:
            t_type = 'Remarketing'
        elif has_interests:
            t_type = 'Interest Audience'
        else:
            t_type = 'Broad'
            
        # Advantage+ / Advantage Audience (common in modern FB ads)
        if targeting.get('targeting_automation', {}).get('advantage_audience'):
            summary_parts.insert(0, "Advantage+ Audience")
            if t_type == 'Broad': t_type = 'Advantage+ (Broad)'

        # Age/Gender constraints
        age_min = targeting.get('age_min')
        age_max = targeting.get('age_max')
        if age_min or age_max:
            summary_parts.append(f"Age: {age_min or 'Any'}-{age_max or 'Any'}")
            
        genders = targeting.get('genders')
        if genders:
            summary_parts.append(f"Genders: {genders}")

        return t_type, " | ".join(summary_parts) if summary_parts else 'Broad'

    if 'targeting' in df_dim.columns:
        parsed = df_dim['targeting'].apply(parse_targeting)
        df_dim['targeting_type'] = parsed.apply(lambda x: x[0])
        df_dim['targeting_summary'] = parsed.apply(lambda x: x[1])
        df_dim.drop(columns=['targeting'], inplace=True)
    
    # Ensure all required columns exist and fill missing values
    if 'adset_name' not in df_dim.columns:
        df_dim['adset_name'] = 'Unknown AdSet'
    else:
        df_dim['adset_name'].fillna('Unknown AdSet', inplace=True)
        
    if 'adset_status' not in df_dim.columns:
        df_dim['adset_status'] = 'UNKNOWN'
    else:
        df_dim['adset_status'].fillna('UNKNOWN', inplace=True)
    
    return df_dim.reset_index(drop=True)


def _extract_dim_ad(df: pd.DataFrame) -> pd.DataFrame:
    """Extract unique ads"""
    
    if 'ad_id' not in df.columns:
        return pd.DataFrame()
    
    cols = ['ad_id', 'adset_id', 'creative_id']
    optional_cols = ['ad_name', 'ad_status']
    
    for col in optional_cols:
        if col in df.columns:
            cols.append(col)
    
    df_dim = df[cols].drop_duplicates(subset=['ad_id'])
    df_dim = df_dim[df_dim['ad_id'] != UNKNOWN_MEMBER_ID]
    
    # Ensure all required columns exist and fill missing values
    if 'ad_name' not in df_dim.columns:
        df_dim['ad_name'] = 'Unknown Ad'
    else:
        df_dim['ad_name'].fillna('Unknown Ad', inplace=True)
        
    if 'ad_status' not in df_dim.columns:
        df_dim['ad_status'] = 'UNKNOWN'
    else:
        df_dim['ad_status'].fillna('UNKNOWN', inplace=True)
    
    return df_dim.reset_index(drop=True)


def _extract_dim_creative(df_facts: pd.DataFrame, df_creatives: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """Extract unique creatives"""
    
    if 'creative_id' not in df_facts.columns:
        return pd.DataFrame()
    
    # Get unique creative IDs from facts
    if 'creative_id' in df_facts.columns:
        creative_ids = df_facts['creative_id'].unique()
    elif 'ad_creative_id' in df_facts.columns:
        creative_ids = df_facts['ad_creative_id'].unique()
    else:
        return pd.DataFrame()
        
    # Filter out unknown members
    creative_ids = creative_ids[creative_ids != UNKNOWN_MEMBER_ID]
    
    # Safe conversion to string - avoid float
    def to_str_safe(x):
        if pd.isna(x) or x == 0: return None
        try:
            # If it's already a float (e.g. from NaNs in a numeric column),
            # split on dot to avoid scientific notation / precision loss if possible
            return str(x).split('.')[0].strip()
        except:
            return None

    creative_ids = [to_str_safe(x) for x in creative_ids if pd.notna(x) and x != 0]
    creative_ids = [x for x in creative_ids if x is not None]
    
    logger.info(f"Found {len(creative_ids)} unique non-zero creative_ids in facts")
    if creative_ids:
        logger.info(f"Sample IDs in facts: {creative_ids[:3]}")

    if len(creative_ids) == 0:
        return pd.DataFrame()
    
    # If creative details provided, use them
    if df_creatives is not None and not df_creatives.empty:
        df_dim = df_creatives.copy()
        
        # Ensure creative_id column exists
        if 'creative_id' not in df_dim.columns and 'id' in df_dim.columns:
            df_dim['creative_id'] = df_dim['id']
        
        # Select relevant columns
        cols_to_keep = [
            'creative_id', 'title', 'body', 'call_to_action_type',
            'image_url', 'video_url', 'video_length_seconds', 'is_video'
        ]
        
        df_dim = df_dim[[col for col in cols_to_keep if col in df_dim.columns]]
        
        # Ensure image_url is populated even if only thumbnail_url was found (handled in fb_api.py already but good to be safe)
        if 'image_url' not in df_dim.columns and 'thumbnail_url' in df_dim.columns:
            df_dim['image_url'] = df_dim['thumbnail_url']
            
        if not df_dim.empty:
            # Ensure IDs are strings for comparison
            df_dim['creative_id'] = df_dim['creative_id'].astype(str).str.strip()
            
            # Extract Video Details if available
            def extract_video_info(row):
                # Try asset_feed_spec (modern Advantage+ / Dynamic ads)
                af = row.get('asset_feed_spec')
                if af and isinstance(af, dict):
                    videos = af.get('videos', [])
                    if videos and isinstance(videos, list) and len(videos) > 0:
                        v = videos[0]
                        row['video_id'] = v.get('video_id', row.get('video_id'))
                        # thumbnail_url here is often better for video posters
                
                # Check object_story_spec (classic ads / mixed)
                oss = row.get('object_story_spec')
                if oss and isinstance(oss, dict):
                    # Check for video_data in oss
                    vd = oss.get('video_data')
                    if vd and isinstance(vd, dict):
                        row['video_id'] = vd.get('video_id', row.get('video_id'))
                        # Some versions have length/url here
                    
                    # Fallback for text if missing at top level
                    link_data = oss.get('link_data', {})
                    if not row.get('title'):
                        row['title'] = link_data.get('name') or link_data.get('title')
                    if not row.get('body'):
                        row['body'] = link_data.get('message') or oss.get('message')

                # Clean up text
                for field in ['title', 'body']:
                    val = row.get(field)
                    if val and isinstance(val, str):
                        row[field] = val.replace('\n', ' ').strip()[:500]
                
                row['video_length_seconds'] = row.get('video_length_seconds') or 0
                return row

            df_dim = df_dim.apply(extract_video_info, axis=1)

            initial_dim_size = len(df_dim)
            df_dim = df_dim[df_dim['creative_id'].isin(creative_ids)]
            logger.info(f"After isin filter: {len(df_dim)} / {initial_dim_size} creative details remain")
    
    else:
        # Create basic creative dimension from facts
        df_dim = pd.DataFrame({'creative_id': creative_ids})
        df_dim['title'] = 'Unknown Creative'
        df_dim['body'] = 'N/A'
        df_dim['call_to_action_type'] = 'N/A'
        df_dim['is_video'] = False
    
    # Fill missing values
    for col in ['title', 'body', 'call_to_action_type']:
        if col not in df_dim.columns:
            df_dim[col] = 'N/A'
        else:
            df_dim[col].fillna('N/A', inplace=True)
    
    # NEW: Preference for ad_name as title as requested by user
    if 'ad_name' in df_facts.columns:
        # Get mapping of creative_id -> ad_name (first encountered)
        # Get mapping of creative_id -> ad_name (first encountered)
        # Ensure keys are strings to match df_dim
        temp_df = df_facts[df_facts['ad_name'].notna() & (df_facts['ad_name'] != 'Unknown Ad')].copy()
        temp_df['creative_id_str'] = temp_df['creative_id'].astype(str).str.split('.').str[0].str.strip()
        ad_name_map = temp_df.groupby('creative_id_str')['ad_name'].first().to_dict()
        
        # Apply to df_dim - only if title is missing or less descriptive
        def apply_ad_name(row):
            cid = str(row.get('creative_id')).split('.')[0].strip() # Standardize to string
            ad_name = ad_name_map.get(cid)
            if ad_name:
                return ad_name
            return row.get('title') or 'Unknown Creative'
        
        df_dim['title'] = df_dim.apply(apply_ad_name, axis=1)
    
    if 'is_video' not in df_dim.columns:
        df_dim['is_video'] = False
    else:
        df_dim['is_video'].fillna(False, inplace=True)
    
    if 'image_url' not in df_dim.columns:
        df_dim['image_url'] = None
    
    if 'video_url' not in df_dim.columns:
        df_dim['video_url'] = None
        
    if 'video_length_seconds' not in df_dim.columns:
        df_dim['video_length_seconds'] = None
    
    return df_dim.reset_index(drop=True)


def _extract_dim_country(df: pd.DataFrame) -> pd.DataFrame:
    """Extract unique countries"""
    
    if 'country' not in df.columns:
        return pd.DataFrame()
    
    df_dim = df[['country']].drop_duplicates()
    df_dim = df_dim[df_dim['country'].notna()]
    
    # Ensure all names are full names (handled in CoreTransformer, but keep here for safety)
    df_dim['country'] = df_dim['country'].apply(map_country_code)
    
    # Extract country code for the schema
    df_dim['country_code'] = df_dim['country'].apply(get_country_code)
    
    # Fill missing codes
    df_dim['country_code'].fillna('XX', inplace=True)
    
    # De-duplicate by country name
    df_dim = df_dim[['country', 'country_code']].drop_duplicates(subset=['country'])
    
    return df_dim.reset_index(drop=True)


def _extract_dim_placement(df: pd.DataFrame) -> pd.DataFrame:
    """Extract unique placements"""
    
    if 'placement_name' not in df.columns:
        return pd.DataFrame()
    
    df_dim = df[['placement_name']].drop_duplicates()
    df_dim = df_dim[df_dim['placement_name'].notna()]
    
    return df_dim.reset_index(drop=True)


def prepare_dimension_for_load(df: pd.DataFrame, dim_name: str) -> pd.DataFrame:
    """
    Prepare dimension DataFrame for loading
    - Cast types
    - Ensure required columns exist
    """
    
    df_prep = df.copy()
    
    # Safe cast ID columns to int64
    for col in df_prep.columns:
        if col.endswith('_id'):
            def to_int_safe(val):
                if pd.isna(val) or str(val).strip() in ['', '0', '0.0', 'None', 'nan']:
                    return UNKNOWN_MEMBER_ID
                try:
                    s = str(val).split('.')[0].strip()
                    return int(s)
                except:
                    return UNKNOWN_MEMBER_ID
            
            df_prep[col] = df_prep[col].apply(to_int_safe).astype(np.int64)
    
    # Ensure string columns are strings
    for col in df_prep.columns:
        if col.endswith('_name') or col in ['country', 'age_group', 'gender', 'placement_name', 'action_type', 'title', 'body', 'image_url', 'video_url', 'call_to_action_type']:
            df_prep[col] = df_prep[col].astype(str).replace(['nan', 'None', '<NA>'], None)
    
    # Cast video_length_seconds to integer
    if 'video_length_seconds' in df_prep.columns:
        df_prep['video_length_seconds'] = pd.to_numeric(df_prep['video_length_seconds'], errors='coerce').fillna(0).astype(int)
        
    # Cast is_video to boolean
    if 'is_video' in df_prep.columns:
        df_prep['is_video'] = df_prep['is_video'].map({True: True, False: False, 'True': True, 'False': False, 1: True, 0: False}).fillna(False).astype(bool)
    
    return df_prep