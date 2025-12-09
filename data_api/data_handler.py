"""
DATA_HANDLER.PY

Purpose: Handles the data cleaning, transformation, and calculation steps 
after data extraction (E) and before the loading (L) stage. This includes 
renaming columns, cleaning missing values, extracting complex JSON fields 
(like 'actions').

Functions:
- extract_actions: Splits the Meta API 'actions' field into 'purchases' and 'leads' (now vectorized).
- split_dataframes_by_granularity: Splits the single DataFrame into Core and Breakdown DataFrames.
- clean_and_calculate: The main orchestration function for all processing steps.
"""

import pandas as pd
import numpy as np
import logging
import json # נשאר חיוני לצורך המרת מחרוזות JSON לרשימת מילונים וקטורית ב-extract_actions
from pandas import json_normalize # ייבוא מפורש לבהירות
from typing import Dict, List, Any 

logger = logging.getLogger(__name__)

# --- Constants for Dimensional Modeling ---
MISSING_DIM_VALUE = 'N/A'
DEFAULT_DATE_STRING = '1970-01-01'

# --- Critical Renaming Map ---
COLUMN_RENAME_MAP = {
    'Ad_Name': 'ad_name', 
    'Date': 'date_start', 
    'publisher_platform': 'placement_name',
    'platform_position': 'placement_name', 
    'placement': 'placement_name'
    # ------------------------------------------------------------------------
}
# --- End Renaming Map ---

# Column Definitions for consistency checks
METRIC_COLUMNS = ['spend', 'impressions', 'clicks', 'purchases', 'leads']
DIM_COLS = ['campaign_name', 'ad_id', 'ad_name', 'placement_name', 'country', 'age_group', 'gender']

# --- Defining the required columns for the CORE Fact Table ---
CORE_DIM_COLS = ['campaign_name', 'ad_id', 'ad_name'] 
CORE_METRIC_COLS = METRIC_COLUMNS 

def extract_actions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Splits the 'actions' column (a complex array/list of dicts) into 
    separate 'purchases' and 'leads' metric columns using vectorized methods 
    (pd.json_normalize and pivot_table).
    """
    
    # 1. Initialize metric columns (preserving existing data or setting to 0.0)
    df['purchases'] = df.get('purchases', 0.0)
    df['leads'] = df.get('leads', 0.0)

    if 'actions' in df.columns and not df['actions'].empty:
        
        df['actions'].fillna('[]', inplace=True)
        
        # --- Vectorized Step 1: Safely Parse JSON Strings to List of Dicts ---
        # משתמשים ב-apply ו-json.loads באופן ממוקד רק כדי להמיר מחרוזות JSON לאובייקטי פייתון (רשימת מילונים).
        # זו הדרך המהירה ביותר ב-Pandas להתמודד עם המרה מבנית זו.
        df['actions'] = df['actions'].apply(
            lambda x: json.loads(x) if isinstance(x, str) and x.strip().startswith(('{', '[')) else x
        )
        
        # זיהוי שורות עם רשימת Actions תקינה
        df_with_actions = df[df['actions'].apply(lambda x: isinstance(x, list) and len(x) > 0)]
        
        if not df_with_actions.empty:
            
            # --- Vectorized Step 2: Flatten/Normalize and Aggregate ---
            
            # 1. Explode: יוצר שורה חדשה לכל "פעולה" (Action) בתוך הרשימה, ושומר על האינדקס המקורי
            df_exploded = df_with_actions.explode('actions')
            
            # 2. Normalize: פותח את המילון (Dict) בתוך עמודת 'actions' לטורים חדשים
            df_normalized = json_normalize(
                df_exploded['actions'],
                errors='ignore'
            ).set_index(df_exploded.index) # משייך מחדש את האינדקס המקורי
            
            # 3. ודא שהטור 'value' קיים וניתן להמרה למספר (Vectorized Numeric Conversion)
            df_normalized['value'] = pd.to_numeric(df_normalized.get('value', 0), errors='coerce').fillna(0)
            
            # 4. Pivot: צבירת הערכים (value) לפי סוג הפעולה (action_type) והאינדקס המקורי
            df_metrics = df_normalized.pivot_table(
                index=df_normalized.index, 
                columns='action_type', 
                values='value', 
                aggfunc='sum', 
                fill_value=0.0
            )

            # --- Vectorized Step 3: Merge back and Update ---
            
            purchase_key = 'offsite_conversion.fb_pixel_purchase'
            lead_key = 'lead'
            
            # עדכון טורי purchases/leads בנתונים החדשים מהצבירה
            if purchase_key in df_metrics.columns:
                # שימוש ב-reindex ו-fillna כדי למזג באופן וקטורי ולשמור על ערכים קיימים שאינם NaN
                df['purchases'] = df_metrics[purchase_key].reindex(df.index).fillna(df['purchases']).astype(float)
                
            if lead_key in df_metrics.columns:
                df['leads'] = df_metrics[lead_key].reindex(df.index).fillna(df['leads']).astype(float)

    # 5. ניקוי סופי: הסר את הטור המורכב 'actions'
    if 'actions' in df.columns:
        df = df.drop(columns=['actions'])
        
    return df


def split_dataframes_by_granularity(df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    """
    Splits the fully processed DataFrame into separate DataFrames 
    based on their level of granularity (Core vs. Breakdown).
    """
    
    base_cols = ['date_id', 'date_start', 'campaign_id'] + CORE_DIM_COLS + CORE_METRIC_COLS
    
    breakdown_groups = {
        'age_gender_metrics': ['age_group', 'gender'],
        'country_metrics': ['country'],
        'placement_metrics': ['placement_name']
    }
    
    fact_dfs = {}

    # --- 1. Identify the Core Data ---
    is_core_data = (
        (df['age_group'] == MISSING_DIM_VALUE) & 
        (df['gender'] == MISSING_DIM_VALUE) & 
        (df['country'] == MISSING_DIM_VALUE) & 
        (df['placement_name'] == MISSING_DIM_VALUE)
    )
    
    df_core = df[is_core_data].copy()
    
    core_final_cols = [col for col in base_cols if col in df_core.columns]
    
    if not df_core.empty:
        fact_dfs['fact_core_metrics'] = df_core[core_final_cols]
    
    # --- 2. Split Breakdown Data ---
    df_breakdown = df[~is_core_data].copy()

    for group_name, dim_list in breakdown_groups.items():
        
        if not all(dim in df_breakdown.columns for dim in dim_list):
            logger.warning(f"Missing one or more expected dimension columns for {group_name}. Skipping split for this group.")
            continue
            
        filter_condition = np.full(len(df_breakdown), False)
        for dim in dim_list:
            filter_condition = filter_condition | (df_breakdown[dim] != MISSING_DIM_VALUE)
        
        df_group = df_breakdown[filter_condition].copy()
        
        if not df_group.empty:
            group_final_cols = [col for col in base_cols + dim_list if col in df_group.columns]
            
            table_key = f'fact_{group_name}'
            fact_dfs[table_key] = df_group[group_final_cols]
        else:
            logger.info(f"No meaningful data found for breakdown group: {group_name}. DF is empty.")

    return fact_dfs


def clean_and_calculate(df: pd.DataFrame) -> Dict[str, pd.DataFrame]: 
    """
    Main function for data processing and cleaning before saving.
    """

    if df.empty:
        logger.warning("Input DataFrame is empty, returning empty DataFrame.")
        return {} 

    # 1. Rename columns to snake_case using the provided map
    df.rename(columns={k: v for k, v in COLUMN_RENAME_MAP.items() if k in df.columns}, inplace=True)
    
    # 2. Handling Actions (Converting actions to purchases and leads)
    df = extract_actions(df)
    
    # 3. Date conversion and creation of the BigInteger 'date_id' key
    if 'date_start' in df.columns:
        df['date_dt'] = pd.to_datetime(df['date_start'], errors='coerce')
        df['date_id'] = df['date_dt'].dt.strftime('%Y%m%d').fillna('0')
        df['date_id'] = pd.to_numeric(df['date_id'], errors='coerce', downcast='integer').fillna(0).astype(int)
        df['date_start'] = df['date_dt'].dt.strftime('%Y-%m-%d').fillna(DEFAULT_DATE_STRING)
        df.drop(columns=['date_dt'], inplace=True)
    else:
        logger.error("Missing 'date_start' column after renaming. Cannot create date_id.")
        df['date_id'] = 0 
        df['date_start'] = DEFAULT_DATE_STRING 
    
    
    # 4. Cleaning and handling MISSING_DIM_VALUE for dimension columns
    all_potential_dim_cols = ['campaign_id'] + DIM_COLS 
    
    for col in all_potential_dim_cols:
        if col in df.columns:
            # Fill NaNs with MISSING_DIM_VALUE and ensure it's string type
            df[col] = df[col].fillna(MISSING_DIM_VALUE).astype(str) 
        else:
            df[col] = MISSING_DIM_VALUE

    # 5. Handling metrics (ensuring they are numeric and filling NaNs/missing with 0.0)
    for col in METRIC_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(float)
        else:
            df[col] = 0.0
    

    # 7. Splitting the single DataFrame into multiple DataFrames for loading
    fact_dfs_dict = split_dataframes_by_granularity(df)
    
    logger.info(f"Data processing complete. Split into {len(fact_dfs_dict)} fact tables.")
    return fact_dfs_dict