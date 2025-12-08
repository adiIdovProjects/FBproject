"""
DATA_HANDLER.PY

Purpose: Handles the data cleaning, transformation, and calculation steps 
after data extraction (E) and before the loading (L) stage. This includes 
renaming columns, cleaning missing values, extracting complex JSON fields 
(like 'actions'), and calculating derived KPIs (CTR, CPC, CPA).

Functions:
- extract_actions: Splits the Meta API 'actions' field into 'purchases' and 'leads'.
- calculate_kpis: Computes derived metrics (CTR, CPC, CPA).
- split_dataframes_by_granularity: Splits the single DataFrame into Core and Breakdown DataFrames.
- clean_and_calculate: The main orchestration function for all processing steps.
"""

import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Any 

logger = logging.getLogger(__name__)

# --- Constants for Dimensional Modeling ---
MISSING_DIM_VALUE = 'N/A'
DEFAULT_DATE_STRING = '1970-01-01'

# --- Critical Renaming Map ---
# Used for standardizing incoming column names to snake_case for the database.
# Only include keys that require transformation (e.g., non-snake_case or aliases).
COLUMN_RENAME_MAP = {
    'Ad_Name': 'ad_name', 
    'Date': 'date_start', # Handling potential alternative naming for date
}
# --- End Renaming Map ---

# Column Definitions for consistency checks
METRIC_COLUMNS = ['spend', 'impressions', 'clicks', 'purchases', 'leads']
KPIS_COLUMNS = ['ctr', 'cpc', 'cpa_lead', 'cpa_purchase']
DIM_COLS = ['campaign_name', 'ad_id', 'ad_name', 'publisher_platform', 'country', 'age', 'gender']

# --- Defining the required columns for the CORE Fact Table ---
CORE_DIM_COLS = ['campaign_name', 'ad_id', 'ad_name'] 
CORE_METRIC_COLS = METRIC_COLUMNS + KPIS_COLUMNS

def extract_actions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Splits the 'actions' column (a complex array/list of dicts) into 
    separate 'purchases' and 'leads' metric columns.
    
    The API returns 'value' as a string, which must be converted to float.
    """
    
    # Initialize metric columns to 0.0 if they don't exist
    df['purchases'] = df.get('purchases', 0.0)
    df['leads'] = df.get('leads', 0.0)

    if 'actions' in df.columns and not df['actions'].empty:
        
        def find_action_value(actions_list, action_type):
            """Helper to extract metric value from the actions list."""
            if isinstance(actions_list, list):
                for item in actions_list:
                    # Check for dict type to avoid errors if the list contains mixed types
                    if isinstance(item, dict) and item.get('action_type') == action_type:
                        try:
                            # Convert string value to float
                            return float(item.get('value', 0))
                        except (TypeError, ValueError):
                            return 0.0
            return 0.0

        # Apply the helper function to extract values
        df['purchases'] = df['actions'].apply(lambda x: find_action_value(x, 'offsite_conversion.fb_pixel_purchase'))
        df['leads'] = df['actions'].apply(lambda x: find_action_value(x, 'lead'))

    # Drop the original 'actions' column
    if 'actions' in df.columns:
        df = df.drop(columns=['actions'])
        
    return df


def calculate_kpis(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates derived KPI metrics (CTR, CPC, CPA).
    Handles division by zero by using numpy's vectorized operations and replacement 
    for infinity (inf).
    """
    
    # Ensure denominator columns exist and are numeric (handled in clean_and_calculate, but good safeguard)
    for col in ['impressions', 'clicks', 'leads', 'purchases']:
        if col not in df.columns:
            df[col] = 0.0
        
    # We use numpy.nan to represent division by zero temporarily, which is then replaced by 0.
    
    # CTR: Clicks / Impressions (Ratio)
    df['ctr'] = df['clicks'].fillna(0) / df['impressions'].replace(0, np.nan)
    
    # CPC: Spend / Clicks
    df['cpc'] = df['spend'].fillna(0) / df['clicks'].replace(0, np.nan)
    
    # CPA Lead: Spend / Leads
    df['cpa_lead'] = df['spend'].fillna(0) / df['leads'].replace(0, np.nan)
        
    # CPA Purchase: Spend / Purchases
    df['cpa_purchase'] = df['spend'].fillna(0) / df['purchases'].replace(0, np.nan)

    # Replace any NaNs that resulted from division by zero with 0
    for col in KPIS_COLUMNS:
        # Rounding to 4 decimal places for currency/ratio-based metrics (optional, but clean)
        df[col] = df[col].fillna(0).round(4).astype(float)
    
    return df

def split_dataframes_by_granularity(df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    """
    Splits the fully processed DataFrame into separate DataFrames 
    based on their level of granularity (Core vs. Breakdown).
    """
    
    # Define base columns for all fact tables
    base_cols = ['date_id', 'date_start', 'campaign_id'] + CORE_DIM_COLS + CORE_METRIC_COLS
    
    # Define groups of breakdown dimensions (The keys must match the fact table suffixes)
    breakdown_groups = {
        'age_gender_metrics': ['age', 'gender'],
        'country_metrics': ['country'],
        'placement_metrics': ['placement_name']
    }
    
    fact_dfs = {}

    # --- 1. Identify the Core Data ---
    # Core data rows are those where ALL breakdown dimensions are the defined MISSING_DIM_VALUE
    is_core_data = (
        (df['age'] == MISSING_DIM_VALUE) & 
        (df['gender'] == MISSING_DIM_VALUE) & 
                (df['country'] == MISSING_DIM_VALUE) &
                (df['placement_name'] == MISSING_DIM_VALUE)    )
    
    df_core = df[is_core_data].copy()
    
    # Keep only the columns relevant to the CORE table
    core_final_cols = [col for col in base_cols if col in df_core.columns]
    
    if not df_core.empty:
        fact_dfs['fact_core_metrics'] = df_core[core_final_cols]
    
    # --- 2. Split Breakdown Data ---
    df_breakdown = df[~is_core_data].copy()

    for group_name, dim_list in breakdown_groups.items():
        
        # Check if all dimension columns for this group exist in the DataFrame
        if not all(dim in df_breakdown.columns for dim in dim_list):
            logger.warning(f"Missing one or more expected dimension columns for {group_name}. Skipping split for this group.")
            continue
            
        # Create a condition where ANY dimension in the group is not MISSING_DIM_VALUE
        filter_condition = np.full(len(df_breakdown), False)
        for dim in dim_list:
            filter_condition = filter_condition | (df_breakdown[dim] != MISSING_DIM_VALUE)
        
        df_group = df_breakdown[filter_condition].copy()
        
        if not df_group.empty:
            # Construct the final column list for this specific breakdown table
            group_final_cols = [col for col in base_cols + dim_list if col in df_group.columns]
            
            table_key = f'fact_{group_name}'
            fact_dfs[table_key] = df_group[group_final_cols]
        else:
            logger.info(f"No meaningful data found for breakdown group: {group_name}. DF is empty.")

    return fact_dfs


def clean_and_calculate(df: pd.DataFrame) -> Dict[str, pd.DataFrame]: 
    """
    Main function for data processing and cleaning before saving.
    
    :param df: The raw DataFrame from the API.
    :return: A dictionary of DataFrames, split by granularity, ready for loading.
    """

    if df.empty:
        logger.warning("Input DataFrame is empty, returning empty DataFrame.")
        return {} # Return empty dictionary instead of empty DataFrame

    # 1. Rename columns to snake_case using the provided map
    df.rename(columns={k: v for k, v in COLUMN_RENAME_MAP.items() if k in df.columns}, inplace=True)
    
    # 1.1. Ensure all expected snake_case dimension columns exist,
    # mapping is done for the non-standard ones in COLUMN_RENAME_MAP.
    
    # 2. Handling Actions (Converting actions to purchases and leads)
    df = extract_actions(df)
    
    # 3. Date conversion and creation of the BigInteger 'date_id' key
    if 'date_start' in df.columns:
        # Convert to datetime objects, coercing errors (invalid dates become NaT)
        df['date_dt'] = pd.to_datetime(df['date_start'], errors='coerce')
        
        # 3.1. Convert valid dates to YYYYMMDD string, use '0' for NaT (Not a Time)
        df['date_id'] = df['date_dt'].dt.strftime('%Y%m%d').fillna('0')
        
        # 3.2. Convert the string ID to BigInteger. NaN is filled with 0.
        df['date_id'] = pd.to_numeric(df['date_id'], errors='coerce', downcast='integer').fillna(0).astype(int)
        
        # 3.3. Clean 'date_start' to be a consistent YYYY-MM-DD string for internal use
        df['date_start'] = df['date_dt'].dt.strftime('%Y-%m-%d').fillna(DEFAULT_DATE_STRING)

        # Remove the temporary datetime column
        df.drop(columns=['date_dt'], inplace=True)
    else:
        logger.error("Missing 'date_start' column after renaming. Cannot create date_id.")
        df['date_id'] = 0 
        df['date_start'] = DEFAULT_DATE_STRING # Default date
    
    
    # 4. Create unified 'placement_name' column, prioritizing granular data
    if 'publisher_platform_and_position' in df.columns:
        df['placement_name'] = df['publisher_platform_and_position'].fillna(MISSING_DIM_VALUE)
    elif 'publisher_platform' in df.columns:
        df['placement_name'] = df['publisher_platform'].fillna(MISSING_DIM_VALUE)
    else:
        df['placement_name'] = MISSING_DIM_VALUE

    # Drop the original columns if they exist, as 'placement_name' is now the canonical column
    df.drop(columns=['publisher_platform', 'publisher_platform_and_position'], errors='ignore', inplace=True)

    # 5. Cleaning and handling MISSING_DIM_VALUE for dimension columns
    all_potential_dim_cols = ['campaign_id', 'placement_name'] + [d for d in DIM_COLS if d not in ['publisher_platform']] 
    
    for col in all_potential_dim_cols:
        if col in df.columns:
            # Fill NaNs with MISSING_DIM_VALUE and ensure it's string type
            df[col] = df[col].fillna(MISSING_DIM_VALUE).astype(str) 
        else:
            # Creating a missing dimension column is CRITICAL for the split logic
            df[col] = MISSING_DIM_VALUE

    # 5. Handling metrics (ensuring they are numeric and filling NaNs/missing with 0.0)
    for col in METRIC_COLUMNS:
        if col in df.columns:
            # Coerce errors, fill NaNs with 0, and ensure float type
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(float)
        else:
            # Creating a metric column with zero if missing
            df[col] = 0.0
    
    # 6. Calculating KPI metrics
    df = calculate_kpis(df)

    # 7. Splitting the single DataFrame into multiple DataFrames for loading
    fact_dfs_dict = split_dataframes_by_granularity(df)
    
    logger.info(f"Data processing complete. Split into {len(fact_dfs_dict)} fact tables.")
    return fact_dfs_dict