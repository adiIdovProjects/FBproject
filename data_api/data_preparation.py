"""
data_preparation.py

Purpose: Contains functions for final data transformation, ensuring column names,
data types, and structure match the target database schema for bulk insertion.
This is called just before the final 'Load' step.
"""
import pandas as pd
import numpy as np
import logging
from typing import List, Dict, Any

# --- CRITICAL IMPORTS for DB Lookup ---
from data_api.db_connector import save_dataframe_to_db
from data_api.database import ENGINE as engine 
# Assuming this is the global engine instance
from sqlalchemy import text # Needed for executing SQL queries
# --- END CRITICAL IMPORTS ---

logger = logging.getLogger(__name__)

# --- Configuration for columns that need explicit casting ---
# These are all the ID columns expected to be BIGINT in the PostgreSQL database.
# MUST include all primary key and foreign key IDs for fact tables (the grain).
ID_COLUMNS_TO_CAST: List[str] = [
    'date_id',
    'campaign_id',
    'ad_id',
    'age_id',
    'gender_id',
    'country_id',
    'placement_id'
]

# --- Mapping of fact columns to target dimension tables for pre-loading ---
# 'source_cols' defines all columns required in the final dimension table (ID and Name).
# FIXED: Updated source_cols to match the standardized DB Schema names.
DIMENSION_MAPPING: Dict[str, Dict[str, List[str] | str]] = {
    'campaign_id': {'table': 'dim_campaign', 'pk': ['campaign_id'], 'source_cols': ['campaign_id', 'campaign_name']},
    'ad_id': {'table': 'dim_ad', 'pk': ['ad_id'], 'source_cols': ['ad_id', 'ad_name']},
    # Attribute Dimensions: Use the DB column name (e.g., 'age_group') here
    'age_id': {'table': 'dim_age', 'pk': ['age_id'], 'source_cols': ['age_id', 'age_group']},
    'gender_id': {'table': 'dim_gender', 'pk': ['gender_id'], 'source_cols': ['gender_id', 'gender']},
    'country_id': {'table': 'dim_country', 'pk': ['country_id'], 'source_cols': ['country_id', 'country']},
    'placement_id': {'table': 'dim_placement', 'pk': ['placement_id'], 'source_cols': ['placement_id', 'placement_name']}, 
}

def get_dimension_lookup_map(table_name: str, id_col: str, name_col: str) -> pd.Series:
    """
    Fetches dimension ID and Name mapping from the database and returns a
    Pandas Series mapping Name (index) -> ID (value).

    This is used by prepare_dataframe_for_db to generate the Foreign Keys.
    """
    if engine is None:
        logger.error(f"DB Engine not initialized for lookup map for {table_name}.")
        return pd.Series(dtype='object')

    # We select the ID and Name columns
    sql_query = f'SELECT "{id_col}", "{name_col}" FROM "{table_name}"'

    try:
        with engine.connect() as connection:
            df_dim = pd.read_sql(text(sql_query), connection)
            # Create a Series mapping Name -> ID
            df_dim.dropna(subset=[name_col, id_col], inplace=True)
            # Ensure the ID column is numeric for later joining/mapping
            df_dim[id_col] = pd.to_numeric(df_dim[id_col], errors='coerce').fillna(0).astype('Int64')
            return df_dim.set_index(name_col)[id_col]
    except Exception as e:
        logger.error(f"Failed to fetch lookup map for {table_name}: {e}", exc_info=False)
        return pd.Series(dtype='object')


def load_all_dimensions_from_facts(fact_dfs: Dict[str, pd.DataFrame]) -> bool:
    """
    Extracts unique dimension members from fact DataFrames and UPSERTs them.

    Handles Attribute Dimensions by ensuring the DataFrame contains both
    the ID (set to 0 for new members) and the Name, satisfying the DB schema
    check.
    """
    if not fact_dfs:
        logger.info("No fact DataFrames provided. Skipping dimension pre-load.")
        return True

    all_dim_success = True

    for dim_id_col, config in DIMENSION_MAPPING.items():
        dim_table_name = config['table']
        pk_col = config['pk'][0]
        source_cols = config['source_cols']
        name_col = source_cols[1] # The Name column (e.g., 'age_group', 'campaign_name')

        # Entity dims use the ID as PK (e.g., campaign_id), Attribute dims use Name as logic PK
        # NOTE: Attribute dimensions (age, gender, country, placement) are defined by the source name.
        is_entity_dim = pk_col in ['campaign_id', 'ad_id']

        # 1. Determine which columns we expect to find in the fact DF
        # Attribute dimensions only need the Name to extract unique members
        required_source_cols_in_fact = source_cols if is_entity_dim else [name_col]

        all_dim_data = []

        for df_name, df in fact_dfs.items():
            
            # --- RENAME RAW COLUMNS TO DB NAMES ---
            # This is crucial because raw data comes as 'publisher_platform' but DB expects 'placement_name'
            if 'publisher_platform_and_position' in df.columns:
                df.rename(columns={'publisher_platform_and_position': 'placement_name'}, inplace=True)
            elif 'publisher_platform' in df.columns:
                df.rename(columns={'publisher_platform': 'placement_name'}, inplace=True)
            if 'age' in df.columns: # Assuming raw name is 'age'
                df.rename(columns={'age': 'age_group'}, inplace=True)
            # ---------------------------------------
            
            # Check if the required source columns (ID and Name, or just Name) are present
            if all(col in df.columns for col in required_source_cols_in_fact):

                # Filter out the 'N/A' placeholder value from the data handler
                df_filtered = df[df[name_col] != 'N/A'].copy()

                if df_filtered.empty:
                    continue

                # Select only the required columns (ID and Name for entity, just Name for attribute)
                # Ensure we only get unique members
                dim_df_subset = df_filtered[required_source_cols_in_fact].drop_duplicates(ignore_index=True)
                all_dim_data.append(dim_df_subset)

        if not all_dim_data:
            logger.debug(f"No unique non-'N/A' data found for dimension '{dim_table_name}'. Skipping.")
            continue

        combined_dim_df = pd.concat(all_dim_data, ignore_index=True)

        # --- Common Cleanup & Validation ---

        # 2. Enforce unique key constraint and prepare for UPSERT
        if is_entity_dim:
            # 2.1 Entity Dimension (PK is the ID)
            upsert_pk = config['pk']

            # Cast the source PK (e.g., campaign_id) to Int64
            try:
                combined_dim_df[pk_col] = pd.to_numeric(combined_dim_df[pk_col], errors='coerce').fillna(0).astype('Int64')
            except Exception as e:
                logger.error(f"Failed to cast primary key '{pk_col}' for {dim_table_name}: {e}", exc_info=False)
                all_dim_success = False
                continue

            # Remove rows where the primary key (ID) is 0 (Unknown/Null)
            combined_dim_df = combined_dim_df[combined_dim_df[pk_col] != 0]

            # Enforce unique ID (PK constraint)
            original_count = len(combined_dim_df)
            combined_dim_df.drop_duplicates(subset=config['pk'], keep='first', inplace=True)
            if len(combined_dim_df) < original_count:
                 logger.warning(f"Dropped {original_count - len(combined_dim_df)} duplicate rows based on Primary Key '{pk_col}' in '{dim_table_name}'.")

            df_for_upsert = combined_dim_df

        else:
            # 2.2 Attribute Dimension (PK is the Name for UPSERT logic)
            # The UPSERT logic will use the 'name_col' as the conflict target,
            # assuming the DB has a UNIQUE constraint on this column.
            upsert_pk = [name_col]

            # Enforce unique Name
            original_count = len(combined_dim_df)
            combined_dim_df.drop_duplicates(subset=[name_col], keep='first', inplace=True)
            if len(combined_dim_df) < original_count:
                 logger.warning(f"Dropped {original_count - len(combined_dim_df)} duplicate rows based on Name column '{name_col}' in '{dim_table_name}'.")

            # --- CRITICAL FIX: Add the ID column (Surrogate Key) back, setting it to 0. ---
            # This ensures the dataframe matches the DB schema before sending to to_sql.
            if pk_col not in combined_dim_df.columns:
                combined_dim_df[pk_col] = 0

            df_for_upsert = combined_dim_df
            # --- END CRITICAL FIX ---


        # Step B: Address NOT NULL constraint on Name/Attribute column (ensure it's not empty string/null)
        df_for_upsert[name_col] = df_for_upsert[name_col].fillna('Unknown').astype(str).str.strip()
        
        # Remove any rows where the attribute name might have ended up as an empty string after stripping
        df_for_upsert = df_for_upsert[df_for_upsert[name_col] != '']

        if df_for_upsert.empty:
            logger.warning(f"Dimension data for '{dim_table_name}' is empty after cleaning. Skipping load.")
            continue

        # Step C: Final column selection - MUST include all columns defined in source_cols
        # This is critical to ensure the DF matches the DB table structure
        final_cols_for_db = [col for col in source_cols if col in df_for_upsert.columns]
        df_for_upsert = df_for_upsert[final_cols_for_db].copy()
        
        # Ensure ID column is Int64 for consistency
        if pk_col in df_for_upsert.columns:
             df_for_upsert[pk_col] = pd.to_numeric(df_for_upsert[pk_col], errors='coerce').fillna(0).astype('Int64')

        # 4. Perform UPSERT into the dimension table
        logger.info(f"Loading {len(df_for_upsert)} unique records (ID/Attribute) into {dim_table_name}...")

        if not save_dataframe_to_db(df_for_upsert, dim_table_name, upsert_pk):
            all_dim_success = False

    return all_dim_success


def prepare_dataframe_for_db(df: pd.DataFrame, table_name: str) -> pd.DataFrame:
    """
    Ensures all key ID columns are cast to the appropriate integer type
    and that no NULL values remain in ID columns that serve as primary keys.

    CRITICALLY: This function performs the Dimension Lookup/Mapping to create
    the missing Foreign Key ID columns (e.g., 'age_id') from
    the dimension name columns (e.g., 'age').
    """
    if df.empty:
        logger.warning(f"Preparation skipped for {table_name}: DataFrame is empty.")
        return df

    logger.info(f"Starting type casting and de-duplication preparation for {table_name}.")

    df_copy = df.copy()

    # --- Dimension Lookup and Mapping (Fact Tables Only) ---
    if table_name.startswith('fact_'):
        logger.info(f"Starting dimension lookups for {table_name}.")

        for dim_id_col, config in DIMENSION_MAPPING.items():

            dim_name_col = config['source_cols'][1]
            dim_table_name = config['table']
            
            # --- RENAME RAW COLUMNS TO DB NAMES ---
            # Ensure the DF has the column name we expect in the DB (standardization)
            if 'publisher_platform_and_position' in df_copy.columns:
                 df_copy.rename(columns={'publisher_platform_and_position': 'placement_name'}, inplace=True)
            elif 'publisher_platform' in df_copy.columns:
                 df_copy.rename(columns={'publisher_platform': 'placement_name'}, inplace=True)
            if 'age' in df_copy.columns:
                 df_copy.rename(columns={'age': 'age_group'}, inplace=True)
            # ---------------------------------------

            # Check if the fact DF contains the dimension NAME column (e.g., 'age_group', 'placement_name')
            if dim_name_col in df_copy.columns:

                # Fetch the lookup map (Name -> ID)
                lookup_map = get_dimension_lookup_map(dim_table_name, dim_id_col, dim_name_col)

                if lookup_map.empty:
                    logger.warning(f"Lookup map for {dim_table_name} is empty. All {dim_id_col} will be set to 0 (Unknown).")
                    df_copy[dim_id_col] = 0
                else:
                    # Perform the actual mapping using the dimension NAME column.
                    # .astype(str).str.strip() ensures clean matching to the map index.
                    df_copy[dim_id_col] = df_copy[dim_name_col].astype(str).str.strip().map(lookup_map)

                logger.debug(f"Successfully mapped '{dim_name_col}' to '{dim_id_col}' for {table_name}.")

                # Drop the source name column after mapping is complete,
                # as the fact table should only store the ID.
                df_copy.drop(columns=[dim_name_col], errors='ignore', inplace=True)

    # --- END Dimension Lookup and Mapping ---


    # --- Enforce Fact Table Grain Uniqueness (Deduplication) ---
    if table_name.startswith('fact_'):
        # Filter ID_COLUMNS_TO_CAST to include only those columns that exist in the DF *after* lookup
        subset_cols = [col for col in ID_COLUMNS_TO_CAST if col in df_copy.columns]

        # The 'date_id' is always assumed to be part of the fact table grain
        if 'date_id' not in subset_cols and 'date_id' in df_copy.columns:
            subset_cols.append('date_id')
            
        if subset_cols:
            # We don't drop duplicates yet, as the aggregation logic in db_connector 
            # handles true duplicates for additive metrics. This step is only for logging/info.
             logger.debug(f"Fact table grain for deduplication/aggregation: {subset_cols}")
        else:
             logger.warning(f"No ID columns found for grain check in Fact table '{table_name}'.")
             
    # --- END Deduplication ---


    # --- Type Casting ---
    for col in ID_COLUMNS_TO_CAST:
        if col in df_copy.columns:
            try:
                # 1. Clean up any leading/trailing spaces (if string source)
                if df_copy[col].dtype == object:
                    df_copy[col] = df_copy[col].astype(str).str.strip()

                # 2. Convert to numeric. Errors (like non-numeric strings or unmapped NaNs) are converted to NaN.
                df_copy[col] = pd.to_numeric(df_copy[col], errors='coerce')

                # 3. CRITICAL: Fill any NaN/NULL values with 0.
                # This handles lookup failures/original NaNs and maps them to the Unknown Member.
                df_copy[col] = df_copy[col].fillna(0)

                # 4. Convert to Pandas nullable integer type ('Int64').
                df_copy[col] = df_copy[col].astype('Int64')

                logger.debug(f"Successfully cast column '{col}' to 'Int64' for {table_name}.")

            except Exception as e:
                logger.error(f"FATAL: Could not cast column '{col}' for table {table_name}. Data issue suspected: {e}", exc_info=False)

    logger.info(f"Finished type casting preparation for {table_name}.")
    return df_copy