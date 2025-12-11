"""
MAIN.PY (ETL Orchestrator)
Purpose: Runs the daily ETL process. Checks DB status, pulls data,
processes it, and loads it into the Star Schema.
"""

import pandas as pd
from datetime import date, timedelta, datetime
from data_api.db_connector import (
    is_first_pull, get_latest_date_in_db, load_all_fact_tables,
    ensure_dates_exist, ensure_unknown_members_exist
)
from data_api.database import ENGINE as engine
from data_api.fb_connector import init_api_connection, get_core_campaign_data, get_breakdown_data
from data_api.data_handler import clean_and_calculate
from data_api.db_schema import create_db_schema
from data_api.data_preparation import (
    prepare_dataframe_for_db,
    load_all_dimensions_from_facts,
    load_lookup_cache, 
    get_all_unique_date_ids 
)
from data_api.static_dimensions import load_dim_age_static, load_dim_gender_static

from config import FIRST_PULL_DAYS, DAILY_PULL_DAYS, BREAKDOWN_LIST_GROUPS, FACT_TABLE_PKS
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

MAIN_FACT_TABLE = 'fact_placement_metrics'

# List of dimension tables that require the Surrogate Key '0' (Unknown Member)
DIMENSIONS_FOR_UNKNOWN_MEMBER = [
    'dim_campaign', 'dim_adset', 'dim_ad', 'dim_creative', 
    'dim_country', 'dim_placement','dim_age', 'dim_gender'
]

def etl_pipeline(start_date: date, end_date: date):
    """
    Orchestrates the full E-T-L pipeline for a given date range.
    """
    logger.info(f"--- Starting ETL Pipeline from {start_date} to {end_date} ---")

    # 1. Check/Create DB Schema
    create_db_schema()

    # 2. E (Extract) Stage - Fetch data from Meta API
    logger.info("Starting E (Extract) Stage: Pulling data from Meta API...")

    api_connection = init_api_connection()
    if not api_connection:
        logger.error("Failed to initialize Meta API connection. Exiting ETL.")
        return

    days_to_pull_int = (end_date - start_date).days
    
    if days_to_pull_int <= 0:
        logger.warning("DB is already up to date or date range is invalid. No new data to pull.")
        return

    # Fetch Core Data
    df_core = get_core_campaign_data(api_connection, days_to_pull_int)
    
    # Fetch Breakdown Data
    df_breakdowns = {}
    
    for group_dict in BREAKDOWN_LIST_GROUPS:
        group_name = group_dict['type']
        breakdowns_list = group_dict['breakdowns']
        key = group_name
        df_breakdowns[key] = get_breakdown_data(api_connection, breakdowns_list, days_to_pull_int)

    raw_data_dfs = {'core': df_core, **df_breakdowns}

    # 3. T (Transform) Stage - Clean, Calculate, and Split
    logger.info("Starting T (Transform) Stage: Cleaning and calculating KPIs...")
    dfs_to_concat = [df for df in raw_data_dfs.values() if not df.empty]
    
    if not dfs_to_concat:
        logger.warning("No data retrieved from Meta API. Exiting ETL.")
        return
        
    combined_df = pd.concat(dfs_to_concat, ignore_index=True)
    fact_dfs = clean_and_calculate(combined_df)
    
    if not fact_dfs:
        logger.error("Transformation stage failed: No fact tables were generated.")
        return

    # 4. Dimension Loading Phase (Pre-Fact Load) 
    logger.info("Starting Dimension Pre-Load Phase: Ensuring FK integrity...")

    # A. Static Dimensions
    load_dim_age_static()
    load_dim_gender_static() 
    
    # B. Unknown Members (Surrogate Key 0)
    # Must ensure the Key=0 exists for all dimensions before facts are processed.
    logger.info("A. Ensuring 'Unknown Member' (Key=0) exists in all core dimension tables.")
    for dim_table in DIMENSIONS_FOR_UNKNOWN_MEMBER:
        ensure_unknown_members_exist(dim_table)
    
    # C. Dynamic Dimensions
    # Load all new identifiers from fact tables into the dimension tables. Must run before cache load.
    logger.info("B. Dynamically loading new dimension members from fact data.")
    load_all_dimensions_from_facts(fact_dfs)

    # D. Date Dimensions (Pre-load)
    # Load new dates into dim_date.
    logger.info("C. Pre-loading all unique dates into dim_date for FK integrity.")
    all_date_ids_list = get_all_unique_date_ids(fact_dfs)

    if all_date_ids_list:
        # The ensure_dates_exist function expects a DataFrame with a date_id column.
        date_df_for_preload = pd.DataFrame({'date_id': all_date_ids_list})
        ensure_dates_exist(date_df_for_preload) 
    else:
        logger.warning("No date_ids found in the batch. Skipping dim_date pre-load.")
    
    # E. Pre-load Dimension Cache (Must run last in Dimension Phase!)
    # Loading the cache must only happen after all dimensions (static, unknown, and dynamic) are loaded into the DB.
    logger.info("D. Loading Dimension ID-Name maps into global lookup cache.")
    load_lookup_cache()
    
    # --- FACT LOADING PHASE ---
    prepared_fact_dfs = {}
    logger.info("Starting final data preparation...")
    
    for table_name, df in fact_dfs.items():
        if df.empty: continue
        
        # This step uses the Lookup Cache loaded in step 4.E
        prepared_df = prepare_dataframe_for_db(df, table_name)
        
        # Validation
        missing_pks = [pk for pk in FACT_TABLE_PKS.get(table_name, []) if pk not in prepared_df.columns]
        if missing_pks:
            logger.error(f"Fact table '{table_name}' missing PKs: {missing_pks}. Skipping.")
            continue

        prepared_fact_dfs[table_name] = prepared_df

    if not prepared_fact_dfs:
        logger.error("No fact tables were successfully prepared for loading.")
        return
    
    # 6. L (Load) Stage
    load_success = load_all_fact_tables(prepared_fact_dfs, FACT_TABLE_PKS)

    # 7. Final Summary
    if load_success:
        logger.info("SUCCESS: ETL Pipeline completed successfully.")
    else:
        logger.error(f"FAILURE: Fact table loading completed with {len(prepared_fact_dfs)} prepared tables, but some loads failed.")


def main():
    # Initialize the Logging system
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 1. Determine the date range to pull
    latest_date_str = get_latest_date_in_db(MAIN_FACT_TABLE)
    end_date = date.today()

    if latest_date_str:
        # CRITICAL FIX: Convert the string from DB to a datetime.date object
        try:
            start_date = datetime.strptime(latest_date_str, '%Y-%m-%d').date()
            
            # Add one day to pull from the day after the last date in the DB
            start_date = start_date + timedelta(days=1)
            
            # Logic for when the DB is already up-to-date (start_date > end_date)
            if start_date > end_date:
                # Pull a small, fixed range backwards (e.g., 2-3 days) to ensure no gaps
                start_date = end_date - timedelta(days=DAILY_PULL_DAYS)
                
        except ValueError:
            logger.error(f"Failed to parse date string: {latest_date_str}. Falling back to full pull.")
            start_date = end_date - timedelta(days=FIRST_PULL_DAYS)
        
        logger.info(f"DB found: Latest date is {latest_date_str}. Starting Incremental Pull from {start_date} to {end_date}.")
    else:
        # Initial Historical Pull
        start_date = end_date - timedelta(days=FIRST_PULL_DAYS)
        logger.info(f"DB is empty. Starting Initial Historical Pull from {start_date} to {end_date}.")
    
    # 2. Run the main process
    etl_pipeline(start_date, end_date)

if __name__ == '__main__':
    main()