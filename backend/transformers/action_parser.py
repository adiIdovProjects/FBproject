"""
transformers/action_parser.py - Parse Facebook Actions Array with Normalization

Transforms Facebook's nested actions structure into flat rows for fact_action_metrics.
Splits leads into 'lead_website' and 'lead_form' and normalizes action names.
"""

import pandas as pd
import numpy as np
import logging
from typing import List, Dict, Any
import json

logger = logging.getLogger(__name__)

# Import config
try:
    from config.settings import ACTION_TYPES_TO_TRACK, UNKNOWN_MEMBER_ID
except ImportError:
    # Default list if settings is missing
    ACTION_TYPES_TO_TRACK = ['purchase', 'lead_website', 'lead_form', 'lead_total', 'add_to_cart']
    UNKNOWN_MEMBER_ID = 0


def normalize_action_type(raw_type: str) -> str:
    """
    מנרמל שמות פעולות ומפריד בין לידים באתר ללידים בטופס פייסבוק.
    """
    if not raw_type:
        return "unknown"
        
    raw_lower = raw_type.lower()
    
    # 1. הפרדת לידים
    if 'lead' in raw_lower:
        if 'offsite' in raw_lower or 'pixel' in raw_lower:
            return 'lead_website'
        if 'onsite' in raw_lower or 'form' in raw_lower:
            return 'lead_form'
        return 'lead_total'
        
    # 2. נרמול רכישות (תופס offsite_conversion.fb_pixel_purchase וכו')
    if 'purchase' in raw_lower:
        return 'purchase'
        
    # 3. שאר הפעולות
    if 'add_to_cart' in raw_lower or 'addtocart' in raw_lower:
        return 'add_to_cart'
    if 'initiate_checkout' in raw_lower:
        return 'initiate_checkout'
    if 'complete_registration' in raw_lower:
        return 'complete_registration'
    if 'view_content' in raw_lower:
        return 'view_content'
        
    return raw_lower


def parse_actions_from_row(row: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Parse actions and action_values from a single Facebook API response row
    """
    result_rows = []
    
    # Extract base keys
    base_keys = {
        'date_id': row.get('date_id', UNKNOWN_MEMBER_ID),
        'account_id': row.get('account_id', UNKNOWN_MEMBER_ID),
        'campaign_id': row.get('campaign_id', UNKNOWN_MEMBER_ID),
        'adset_id': row.get('adset_id', UNKNOWN_MEMBER_ID),
        'ad_id': row.get('ad_id', UNKNOWN_MEMBER_ID),
        'creative_id': row.get('creative_id', UNKNOWN_MEMBER_ID),
    }
    
    # Parse actions & action_values (handles both string and list)
    def safe_json_load(val):
        if isinstance(val, str):
            try: return json.loads(val)
            except: return []
        return val if isinstance(val, list) else []

    actions = safe_json_load(row.get('actions'))
    action_values = safe_json_load(row.get('action_values'))
    
    # Create lookup for action values (mapped with normalized types)
    value_lookup = {}
    for action_val in action_values:
        raw_type = action_val.get('action_type', '')
        norm_type = normalize_action_type(raw_type)
        
        for key, val in action_val.items():
            if key not in ['action_type', 'value']:
                try:
                    v = float(val)
                    value_lookup[f"{norm_type}_{key}"] = v
                    value_lookup[f"{raw_type}_{key}"] = v
                except: pass
    
    # Process each action
    for action in actions:
        raw_type = action.get('action_type', '')
        norm_type = normalize_action_type(raw_type)
        
        # Filter: Only keep what we track
        if norm_type not in ACTION_TYPES_TO_TRACK:
            continue
        
        for key, val in action.items():
            if key == 'action_type': continue
            
            attribution_window = '7d_click' if key == 'value' else key
            
            try: count = int(float(val))
            except: count = 0
            
            if count == 0: continue
            
            # Get value using normalized type first
            action_value = value_lookup.get(f"{norm_type}_{attribution_window}", 
                           value_lookup.get(f"{raw_type}_{attribution_window}", 0.0))
            
            result_rows.append({
                **base_keys,
                'action_type': norm_type,
                'attribution_window': attribution_window,
                'action_count': count,
                'action_value': action_value,
            })
            
    return result_rows


def parse_actions_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Parse actions for entire DataFrame"""
    if df.empty or 'actions' not in df.columns:
        return pd.DataFrame()
    
    all_action_rows = []
    for idx, row in df.iterrows():
        try:
            parsed_actions = parse_actions_from_row(row.to_dict())
            all_action_rows.extend(parsed_actions)
        except Exception as e:
            logger.error(f"Error parsing actions for row {idx}: {e}")
            continue
            
    return pd.DataFrame(all_action_rows) if all_action_rows else pd.DataFrame()


def extract_top_conversions_for_fact_core(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract top conversion types for fact_core_metrics using normalized names
    """
    if df.empty or 'actions' not in df.columns:
        return df
    
    # Initialize columns
    core_metrics = ['purchases', 'purchase_value', 'leads_website', 'leads_form', 'add_to_cart']
    for col in core_metrics:
        df[col] = 0.0 if 'value' in col else 0
    
    for idx, row in df.iterrows():
        def safe_json_load(val):
            if isinstance(val, str):
                try: return json.loads(val)
                except: return []
            return val if isinstance(val, list) else []

        actions = safe_json_load(row.get('actions'))
        action_values = safe_json_load(row.get('action_values'))
        
        # Value Lookup (7d_click or 'value')
        v_lookup = {}
        for av in action_values:
            nt = normalize_action_type(av.get('action_type', ''))
            val = float(av.get('7d_click', av.get('value', 0)))
            v_lookup[nt] = v_lookup.get(nt, 0.0) + val
            
        # Extract counts
        for action in actions:
            nt = normalize_action_type(action.get('action_type', ''))
            count = int(float(action.get('7d_click', action.get('value', 0))))
            
            if nt == 'purchase':
                df.at[idx, 'purchases'] += count
                df.at[idx, 'purchase_value'] = v_lookup.get('purchase', 0.0)
            elif nt == 'lead_website':
                df.at[idx, 'leads_website'] += count
            elif nt == 'lead_form':
                df.at[idx, 'leads_form'] += count
            elif nt == 'add_to_cart':
                df.at[idx, 'add_to_cart'] += count
    
    return df


def parse_video_actions(df: pd.DataFrame) -> pd.DataFrame:
    """Parse video metrics from actions array and ensure numeric types"""
    video_fields = [
        'video_play_actions', 'video_p25_watched_actions',
        'video_p50_watched_actions', 'video_p75_watched_actions',
        'video_p100_watched_actions',
    ]
    
    for field in video_fields:
        if field in df.columns:
            def extract_video_value(val):
                if pd.isna(val) or val == '': return 0
                if isinstance(val, (int, float)): return int(val)
                if isinstance(val, str):
                    try:
                        parsed = json.loads(val)
                        if isinstance(parsed, list) and len(parsed) > 0:
                            return int(float(parsed[0].get('value', 0)))
                    except: pass
                    try: return int(float(val))
                    except: return 0
                return 0
            df[field] = df[field].apply(extract_video_value)
    
    rename_map = {
        'video_play_actions': 'video_plays',
        'video_p25_watched_actions': 'video_p25_watched',
        'video_p50_watched_actions': 'video_p50_watched',
        'video_p75_watched_actions': 'video_p75_watched',
        'video_p100_watched_actions': 'video_p100_watched',
    }
    df.rename(columns=rename_map, inplace=True, errors='ignore')
    return df