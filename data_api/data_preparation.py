"""
data_preparation.py

Purpose: Contains functions for final data transformation, including:
1. Defining the mapping between Fact columns and Dimension tables (DIMENSION_MAPPING).
2. Extracting unique dimension members from the raw fact data and UPSERTing them (Dynamic Loading).
3. NEW: Pre-loading all Dimension ID-Name maps into a global cache (Optimization).
4. Performing Dimension Lookup (Name -> ID) on Fact tables using the cache.
5. Performing Type Casting and data cleaning for the final Load step.

NOTE: Dimension Age (dim_age) is explicitly skipped from dynamic loading here, 
as it is loaded statically from static_dimensions.py.
"""
import pandas as pd
import numpy as np
import logging
from typing import List, Dict, Any

# --- CRITICAL IMPORTS for DB Lookup ---
from data_api.db_connector import save_dataframe_to_db
from data_api.database import ENGINE as engine 
from sqlalchemy import text
# --- END CRITICAL IMPORTS ---

logger = logging.getLogger(__name__)

# --- Configuration ---
# All ID columns expected to be BIGINT in the database
ID_COLUMNS_TO_CAST: List[str] = [
    'date_id', 'campaign_id', 'ad_id', 'age_id', 'gender_id', 'country_id', 'placement_id'
]

# --- Mapping ---
# Maps fact columns (keys) to their corresponding dimension tables (values)
DIMENSION_MAPPING: Dict[str, Dict[str, List[str] | str]] = {
    # Entity Dimensions (PK is the external ID)
    'campaign_id': {'table': 'dim_campaign', 'pk': ['campaign_id'], 'source_cols': ['campaign_id', 'campaign_name']},
    'ad_id': {'table': 'dim_ad', 'pk': ['ad_id'], 'source_cols': ['ad_id', 'ad_name']},
    
    # Attribute Dimensions (PK is the Name/Group, ID is auto-generated/placeholder)
    'age_id': {'table': 'dim_age', 'pk': ['age_group'], 'source_cols': ['age_id', 'age_group']}, 
    'gender_id': {'table': 'dim_gender', 'pk': ['gender'], 'source_cols': ['gender_id', 'gender']},
    'country_id': {'table': 'dim_country', 'pk': ['country'], 'source_cols': ['country_id', 'country']},
    'placement_id': {'table': 'dim_placement', 'pk': ['placement_name'], 'source_cols': ['placement_id', 'placement_name']},
    'date_id': {'table': 'dim_date', 'pk': ['date_id'], 'source_cols': ['date_id', 'date_start']}, # Used only for reference
}

# --- OPTIMIZATION: Global Cache for Lookups ---
# Stores the ID <-> Name mapping (pd.Series: Index=Name, Value=ID)
DIMENSION_LOOKUP_CACHE: Dict[str, pd.Series] = {}


def get_dimension_lookup_map(table_name: str, id_col: str, name_col: str) -> pd.Series:
    """
    Fetches dimension ID and Name mapping from the database for Lookup.
    Returns a Series: Index = name_col (e.g., '18-24'), Value = id_col (e.g., 5).
    """
    if engine is None:
        return pd.Series(dtype='object')

    # Note: dim_date is handled by ensure_dates_exist and doesn't need ID lookup
    if id_col == 'date_id':
        return pd.Series(dtype='object') 

    sql_query = f'SELECT "{id_col}", "{name_col}" FROM "{table_name}"'

    try:
        with engine.connect() as connection:
            df_dim = pd.read_sql(text(sql_query), connection)
            df_dim.dropna(subset=[name_col, id_col], inplace=True)
            
            # Drop duplicates to prevent InvalidIndexError during mapping
            df_dim.drop_duplicates(subset=[name_col], keep='first', inplace=True)

            # Ensure ID column is Int64 for mapping consistency
            df_dim[id_col] = pd.to_numeric(df_dim[id_col], errors='coerce').fillna(0).astype('Int64')
            
            # The Series index is the Name, the value is the ID
            return df_dim.set_index(name_col)[id_col]
    except Exception as e:
        logger.error(f"Failed to fetch lookup map for {table_name}: {e}", exc_info=False)
        return pd.Series(dtype='object')


def load_lookup_cache() -> None:
    """
    Optimization: Loads all required dimension ID/Name maps into the global cache
    by calling get_dimension_lookup_map once per dimension.
    (This function should be called once in main.py before prepare_dataframe_for_db).
    """
    global DIMENSION_LOOKUP_CACHE
    
    logger.info("Pre-loading dimension lookup maps into global cache...")

    # Clear existing cache
    DIMENSION_LOOKUP_CACHE = {} 
    
    for dim_id_col, config in DIMENSION_MAPPING.items():
        # date_id is explicitly an integer ID and doesn't need string-to-ID lookup
        if dim_id_col == 'date_id':
            continue
            
        dim_table_name = config['table']
        dim_name_col = config['source_cols'][1]
            
        try:
            lookup_map = get_dimension_lookup_map(dim_table_name, dim_id_col, dim_name_col)
            if not lookup_map.empty:
                # Key the cache by the Fact ID column name (e.g., 'age_id')
                DIMENSION_LOOKUP_CACHE[dim_id_col] = lookup_map
                logger.debug(f"Cached map for {dim_table_name} ({len(lookup_map)} entries).")
            # If map is empty, we leave it out of the cache, and lookup will use 0 (Unknown)
        except Exception as e:
            logger.error(f"Failed to cache lookup map for {dim_table_name}: {e}")
            
    logger.info(f"Finished caching. {len(DIMENSION_LOOKUP_CACHE)} dimension maps loaded.")


def load_all_dimensions_from_facts(fact_dfs: Dict[str, pd.DataFrame]) -> bool:
    """
    Extracts unique dimension members (excluding Age/Gender) from fact DataFrames and UPSERTs them.
    """
    if not fact_dfs:
        return True

    all_dim_success = True

    for dim_id_col, config in DIMENSION_MAPPING.items():
        dim_table_name = config['table']
        
        # --- SKIP: dim_age and dim_gender are handled statically ---
        if dim_table_name in ['dim_age', 'dim_gender', 'dim_date']:
            continue 
        # ------------------------------------------

        pk_col = config['pk'][0]
        source_cols = config['source_cols'] # e.g. ['country_id', 'country']
        name_col = source_cols[1] # e.g. 'country'

        is_entity_dim = pk_col in ['campaign_id', 'ad_id']
        required_source_cols_in_fact = source_cols if is_entity_dim else [name_col]
        all_dim_data = []

        for df_name, df in fact_dfs.items():
            
            # --- REDUNDANT RENAME REMOVED HERE ---
            # NOTE: Renaming (e.g., 'age' -> 'age_group') is now handled upstream in data_handler.py
            
            # Check if all required columns for the dimension exist
            if all(col in df.columns for col in required_source_cols_in_fact):
                # Filter out 'N/A' as we handle unknowns later
                df_filtered = df[df[name_col] != 'N/A'].copy()
                if df_filtered.empty: continue
                
                dim_df_subset = df_filtered[required_source_cols_in_fact].drop_duplicates(ignore_index=True)
                all_dim_data.append(dim_df_subset)

        if not all_dim_data:
            continue

        combined_dim_df = pd.concat(all_dim_data, ignore_index=True)
        
        # Deduplication based on the name column
        combined_dim_df.drop_duplicates(subset=[name_col], keep='first', inplace=True)

        if is_entity_dim:
            # For Campaign/Ad, the PK is the ID itself
            upsert_pk = config['pk']
            try:
                combined_dim_df[pk_col] = pd.to_numeric(combined_dim_df[pk_col], errors='coerce').fillna(0).astype('Int64')
            except: 
                logger.error(f"Failed to cast entity ID {pk_col} for {dim_table_name}")
                continue
            
            combined_dim_df = combined_dim_df[combined_dim_df[pk_col] != 0]
            df_for_upsert = combined_dim_df
        else:
            # For Attribute dims (Country, Placement), the PK is the name_col
            upsert_pk = [name_col]
            # Ensure the ID column exists before saving (for the schema)
            if pk_col not in combined_dim_df.columns:
                combined_dim_df[pk_col] = 0
            df_for_upsert = combined_dim_df.copy()

        # Clean strings
        if name_col in df_for_upsert.columns:
            df_for_upsert[name_col] = df_for_upsert[name_col].fillna('Unknown').astype(str).str.strip()
            df_for_upsert = df_for_upsert[df_for_upsert[name_col] != '']

        if df_for_upsert.empty: continue

        # Final column selection
        final_cols_for_db = [col for col in source_cols if col in df_for_upsert.columns]
        df_for_upsert = df_for_upsert[final_cols_for_db].copy()
        
        if pk_col in df_for_upsert.columns:
             # Ensure the ID column is Int64 (0 if null/bad data)
             df_for_upsert[pk_col] = pd.to_numeric(df_for_upsert[pk_col], errors='coerce').fillna(0).astype('Int64')

        logger.info(f"Loading {len(df_for_upsert)} unique records into {dim_table_name}...")
        if not save_dataframe_to_db(df_for_upsert, dim_table_name, upsert_pk):
            all_dim_success = False

    return all_dim_success


def prepare_dataframe_for_db(df: pd.DataFrame, table_name: str) -> pd.DataFrame:
    """
    Performs Dimension Lookup (Name -> ID) using the cache and Type Casting.
    """
    if df.empty: 
        logger.info(f"DataFrame for {table_name} is empty, skipping preparation.")
        return df
        
    logger.info(f"Starting preparation for {table_name}.")
    df_copy = df.copy()

    # Fallback/Safety Check: Ensure cache is loaded before iterating
    global DIMENSION_LOOKUP_CACHE
    if not DIMENSION_LOOKUP_CACHE and table_name.startswith('fact_'):
        logger.warning("Dimension lookup cache is empty. Loading it now. (Performance warning: Should be done once in main.py)")
        load_lookup_cache() 

    # --- Dimension Lookup ---
    if table_name.startswith('fact_'):
        for dim_id_col, config in DIMENSION_MAPPING.items():
            
            if dim_id_col == 'date_id':
                continue # date_id is already prepared as ID in data_handler

            dim_name_col = config['source_cols'][1] # e.g. age_group
            
            # --- REDUNDANT RENAME REMOVED HERE ---
            # NOTE: Renaming raw columns (like 'age' or 'publisher_platform') 
            # is now handled upstream in data_handler.py.
            # -------------------------------------

            if dim_name_col in df_copy.columns:
                # Retrieve the map from the global cache
                lookup_map = DIMENSION_LOOKUP_CACHE.get(dim_id_col)

                # Set default to 0 (Unknown Member ID)
                default_id = 0
                
                if lookup_map is None or lookup_map.empty:
                    df_copy[dim_id_col] = default_id # Default to 0 (Unknown) if map is empty
                else:
                    # Convert source column to string, strip spaces, and map.
                    # .fillna(default_id) handles cases where the name is not in the map (NaN result from .map)
                    df_copy[dim_id_col] = (
                        df_copy[dim_name_col]
                        .astype(str)
                        .str.strip()
                        .map(lookup_map)
                        .fillna(default_id) 
                    )
                
                # After mapping, we drop the descriptive column
                df_copy.drop(columns=[dim_name_col], errors='ignore', inplace=True)
            else:
                 # If the descriptive column is missing, still ensure the ID column exists and is 0
                 df_copy[dim_id_col] = 0

    # --- Type Casting ---
    for col in ID_COLUMNS_TO_CAST:
        if col in df_copy.columns:
            try:
                # Coerce errors (e.g., NaNs from failed lookup), fill NaNs with 0, and ensure Int64 type
                df_copy[col] = pd.to_numeric(df_copy[col], errors='coerce').fillna(0).astype('Int64')
            except Exception as e:
                logger.error(f"Failed to cast column '{col}' to 'Int64' in {table_name}: {e}")

    return df_copy