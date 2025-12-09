"""
MAIN.PY (ETL Orchestrator)
Purpose: Runs the daily ETL process. Checks DB status, pulls data, 
processes it, and loads it into the Star Schema.
"""

import pandas as pd
from datetime import date, timedelta
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
)
# --- UPDATED: Import both static load functions ---
from data_api.static_dimensions import load_dim_age_static, load_dim_gender_static 
# --- END UPDATED IMPORT ---

from config import FIRST_PULL_DAYS, DAILY_PULL_DAYS, BREAKDOWN_LIST_GROUPS, FACT_TABLE_PKS
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

MAIN_FACT_TABLE = 'fact_placement_metrics' 

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

    # ✅ תיקון 2: חישוב ימי המשיכה בפועל מהטווח שהתקבל מ-main()
    days_to_pull_int = (end_date - start_date).days
    
    # Fetch Core Data
    # ❗ שימוש ב-days_to_pull_int (1100 בריצה ראשונה, 3 בריצה יומית)
    df_core = get_core_campaign_data(api_connection, days_to_pull_int) 
    
    # Fetch Breakdown Data (Age/Gender, Placement, Country)
    df_breakdowns = {}
    
    # ✅ תיקון 3: לולאה על מבנה הרשימה של BREAKDOWN_LIST_GROUPS
    for group_dict in BREAKDOWN_LIST_GROUPS:
        group_name = group_dict['type']
        breakdowns_list = group_dict['breakdowns']
        key = group_name # השתמש ב-'type' כמפתח במקום ב-'_'.join()
        
        # ❗ שימוש ב-days_to_pull_int
        df_breakdowns[key] = get_breakdown_data(api_connection, breakdowns_list, days_to_pull_int)

    raw_data_dfs = {'core': df_core, **df_breakdowns}

    # 3. T (Transform) Stage - Clean, Calculate, and Split
    logger.info("Starting T (Transform) Stage: Cleaning and calculating KPIs...")

    # ✅ תיקון 4: טיפול בשגיאת 'No objects to concatenate'
    dfs_to_concat = [df for df in raw_data_dfs.values() if not df.empty]
    
    if not dfs_to_concat:
        logger.warning("No data retrieved from Meta API. Exiting ETL.")
        return 
        
    combined_df = pd.concat(dfs_to_concat, ignore_index=True)

    # השורה הזו מיותרת כעת לאחר הבדיקה של dfs_to_concat
    # if combined_df.empty:
    #     logger.warning("No data retrieved from Meta API. Exiting ETL.")
    #     return

    fact_dfs = clean_and_calculate(combined_df)
    
    if not fact_dfs:
        logger.error("Transformation stage failed: No fact tables were generated.")
        return

    # 4. Dimension Loading Phase (Pre-Fact Load)
    logger.info("Starting Dimension Pre-Load Phase...")

    # A. Static Dimensions - Must be loaded first!
    # CRITICAL FIX for Foreign Key: Load age and gender ranges (including 'Unknown') first.
    load_dim_age_static()
    load_dim_gender_static() # --- NEW CALL ---

    # B. Dynamic Dimensions - Load unique members from the raw data
    load_all_dimensions_from_facts(fact_dfs)

    # C. Unknown Members Fallback - Ensure key 0 exists everywhere, even if static/dynamic loading failed.
    # This must run after all dimensions are defined (static and dynamic)
    ensure_unknown_members_exist() 
    
    # --- FACT LOADING PHASE ---
    prepared_fact_dfs = {}
    logger.info("Starting final data preparation...")
    
    for table_name, df in fact_dfs.items():
        if df.empty: continue
            
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
    
    # 5. Pre-load dates (CRITICAL for FK integrity)
    if 'fact_core_metrics' in prepared_fact_dfs:
        ensure_dates_exist(prepared_fact_dfs['fact_core_metrics']) 
    else:
        logger.error("Cannot perform dim_date pre-load: 'fact_core_metrics' is missing from prepared data.")
    
    # 6. L (Load) Stage
    load_success = load_all_fact_tables(prepared_fact_dfs, FACT_TABLE_PKS)

    # 7. Final Summary
    if load_success:
        logger.info("SUCCESS: ETL Pipeline completed successfully.")
    else:
        logger.error(f"FAILURE: Fact table loading completed with {len(prepared_fact_dfs)} prepared tables, but some loads failed.")


def main():
    # Initialize the Logging system - mandatory to see the output
    logging.basicConfig(
        level=logging.INFO, 
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 1. Determine the date range to pull
    latest_date = get_latest_date_in_db(MAIN_FACT_TABLE)

    if latest_date:
        # ריצה יומית (Incremental Pull)
        start_date = latest_date
        end_date = date.today() 
        logger.info(f"DB found: Latest date is {latest_date}. Starting Incremental Pull from {start_date} to {end_date}.")
    else:
        # ריצה היסטורית (Initial Historical Pull)
        end_date = date.today()
        
        # ✅ תיקון 1: חישוב start_date נכון למשיכה היסטורית (1100 ימים)
        # יש לוודא ש-FIRST_PULL_DAYS הוא integer ב-config.py
        start_date = end_date - timedelta(days=FIRST_PULL_DAYS) 
        
        logger.info(f"DB is empty. Starting Initial Historical Pull from {start_date} to {end_date}.")
    
    # 2. Run the main process
    etl_pipeline(start_date, end_date)

if __name__ == '__main__':
    main()