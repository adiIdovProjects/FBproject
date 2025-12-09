"""
DATA_HANDLER.PY

Purpose: Handles the data cleaning, transformation, and calculation steps 
after data extraction (E) and before the loading (L) stage. This includes 
renaming columns, cleaning missing values, extracting complex JSON fields 
(like 'actions'), and calculating derived KPIs (CTR, CPC, CPA).

Functions:
- extract_actions: Splits the Meta API 'actions' field into 'purchases' and 'leads'.
- split_dataframes_by_granularity: Splits the single DataFrame into Core and Breakdown DataFrames.
- clean_and_calculate: The main orchestration function for all processing steps.
"""

import pandas as pd
import numpy as np
import logging
import json # <--- חיוני לטיפול בטורים מורכבים
from typing import Dict, List, Any 

logger = logging.getLogger(__name__)

# --- Constants for Dimensional Modeling ---
MISSING_DIM_VALUE = 'N/A'
DEFAULT_DATE_STRING = '1970-01-01'

# --- Critical Renaming Map ---
COLUMN_RENAME_MAP = {
    'Ad_Name': 'ad_name', 
    'Date': 'date_start', 
    # ✅ FIX 1: הוספת מיפוי לטורי פלייסמנט כדי להבטיח שהנתונים ייכנסו ל-fact_placement_metrics
    'publisher_platform': 'placement_name',
    'platform_position': 'placement_name', 
    'placement': 'placement_name'
    # ------------------------------------------------------------------------
}
# --- End Renaming Map ---

# Column Definitions for consistency checks
METRIC_COLUMNS = ['spend', 'impressions', 'clicks', 'purchases', 'leads']
# ❌ REMOVED: KPIS_COLUMNS (כיוון שהם מסוננים על ידי ה-DB)
DIM_COLS = ['campaign_name', 'ad_id', 'ad_name', 'placement_name', 'country', 'age_group', 'gender']

# --- Defining the required columns for the CORE Fact Table ---
CORE_DIM_COLS = ['campaign_name', 'ad_id', 'ad_name'] 
# ✅ FIX 2: הסרת KPIS מ-CORE_METRIC_COLS
CORE_METRIC_COLS = METRIC_COLUMNS 

def extract_actions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Splits the 'actions' column (a complex array/list of dicts) into 
    separate 'purchases' and 'leads' metric columns. (הגרסה הנקייה והמוגנת)
    """
    
    df['purchases'] = df.get('purchases', 0.0)
    df['leads'] = df.get('leads', 0.0)

    if 'actions' in df.columns and not df['actions'].empty:
        
        # --- תיקון סופי ל-JSON: מטפל ב-NaN ומבצע המרה בטוחה ---
        df['actions'].fillna('[]', inplace=True)
        
        def safe_json_load(data):
            if isinstance(data, str):
                try:
                    return json.loads(data)
                except json.JSONDecodeError:
                    return [] 
            return data 

        df['actions'] = df['actions'].apply(safe_json_load)
        # --------------------------------------------------------
        
        def find_action_value(actions_list, action_type):
            """Helper to extract metric value from the actions list."""
            if not isinstance(actions_list, list):
                return 0.0
            
            for item in actions_list:
                if isinstance(item, dict) and item.get('action_type') == action_type:
                    try:
                        return float(item.get('value', 0))
                    except (TypeError, ValueError):
                        return 0.0
            return 0.0

        df['purchases'] = df['actions'].apply(lambda x: find_action_value(x, 'offsite_conversion.fb_pixel_purchase'))
        df['leads'] = df['actions'].apply(lambda x: find_action_value(x, 'lead'))

    if 'actions' in df.columns:
        df = df.drop(columns=['actions'])
        
    return df


# ❌ REMOVED: הפונקציה calculate_kpis הוסרה כולה מהקובץ.


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
    
    # סינון טורים בהתאם ל-CORE_METRIC_COLS המעודכן (ללא KPIs)
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
    
    # --- DEBUG: Inspecting ALL Columns for Complex Data Types (נשאר לדיבוג) ---
    print("\n--- DEBUG: Inspecting ALL Columns for Complex Data Types ---")
    for col in df.columns:
        first_non_null = df[col].dropna().iloc[0] if not df[col].dropna().empty else None
        
        if first_non_null is not None:
            if isinstance(first_non_null, (list, dict)):
                print(f"!!! DEBUG CRASH ALERT !!! Column '{col}' contains native Python type: {type(first_non_null)}.")
                print(f"Sample Value: {first_non_null}")
            elif isinstance(first_non_null, str) and first_non_null.strip().startswith(('{', '[')):
                print(f"!!! DEBUG CRASH WARNING !!! Column '{col}' contains unparsed JSON String. First element type: {type(first_non_null)}.")
                print(f"Sample Value: {first_non_null[:100]}...")
            
    print("--- DEBUG: Inspection complete. Proceeding to Data Processing ---\n")
    # ----------------------------------------

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
    
    # 6. Calculating KPI metrics - REMOVED!
    # אין צורך בחישוב KPIs כיוון שהם אינם נשמרים בטבלאות ה-Fact.

    # 7. Splitting the single DataFrame into multiple DataFrames for loading
    fact_dfs_dict = split_dataframes_by_granularity(df)
    
    logger.info(f"Data processing complete. Split into {len(fact_dfs_dict)} fact tables.")
    return fact_dfs_dict