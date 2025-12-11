#db_connector

"""
Purpose: Manages the low-level database connection and persistence layer 
for the ETL pipeline (PostgreSQL/SQLAlchemy). It handles checking table 
status, and the logic for complex database operations like UPSERT 
(Insert ON CONFLICT UPDATE).

Functions:
- is_first_pull: Checks if a specified table exists and contains any data.
- get_latest_date_in_db: Retrieves the maximum 'date' value from a fact table.
- save_dataframe_to_db: Saves a single DataFrame to a table using UPSERT logic, with robust PK checking.
- load_all_fact_tables: Orchestrates the loading of all split fact tables.
- ensure_dates_exist: Pre-loads missing dates into dim_date to satisfy Foreign Key constraints.
- ensure_unknown_members_exist: Pre-loads the Surrogate Key 0 into dimension tables.
"""

import os
import pandas as pd
from sqlalchemy import text, inspect
from sqlalchemy.exc import OperationalError, NoSuchTableError
from datetime import date, datetime 
import logging
from typing import Dict, List, Any, Union

# --- Import Global Engine ---
# Assuming 'data_api.database' provides the engine instance
try:
    from data_api.database import ENGINE as engine 
except ImportError:
    # Placeholder/Mock for environments where the full DB connection isn't set up
    engine = None 
    logging.warning("DB Engine not imported/initialized. Database functions are disabled.")

logger = logging.getLogger(__name__)

# --- Unknown Member Definitions ---
# Defines the default rows (Surrogate Key 0) required in dimension tables 
# to satisfy Foreign Keys for unmapped/null fact data.
UNKNOWN_MEMBER_DEFAULTS: Dict[str, Dict[str, Any]] = {
    'dim_campaign': {
        'campaign_id': 0, 
        'campaign_name': 'Unknown Campaign', 
        'status': 'N/A', 
        'objective': 'N/A'
    },
    'dim_adset': { # >> תיקון: הוספת ממד AdSet
        'adset_id': 0,
        'adset_name': 'Unknown AdSet'
    },
    'dim_ad': {
        'ad_id': 0, 
        'ad_name': 'Unknown Ad', 
        'creative_name': 'N/A'
    },
    'dim_creative': { # >> תיקון: הוספת ממד Creative
        'creative_id': 0,
        'creative_name': 'Unknown Creative'
    },
    'dim_placement': {
        'placement_id': 0, 
        'placement_name': 'Unknown Placement'
    },
    'dim_age': {
        'age_id': 0, 
        'age_group': 'N/A' # Use the raw column name for attribute dimensions
    },
    'dim_gender': {
        'gender_id': 0, 
        'gender': 'N/A' # Use the raw column name for attribute dimensions
    },
    'dim_country': {
        'country_id': 0, 
        'country': 'N/A' # Use the raw column name for attribute dimensions
    },
}
# --- End Unknown Member Definitions ---


def is_first_pull(table_name: str) -> bool:
    """
    Checks if the table exists and contains any rows.
    
    :param table_name: The name of the table to check (e.g., 'dim_campaign').
    :return: True if the table is empty or does not exist, False otherwise.
    """
    if engine is None:
        logger.warning("DB Engine is None, returning True for first pull.")
        return True
    
    try:
        with engine.connect() as connection:
            # Check if the table contains at least one row
            # Ensure table name is correctly quoted for safety
            result = connection.execute(
                text(f'SELECT 1 FROM "{table_name}" LIMIT 1')
            ).fetchone()
            
            return result is None
            
    except OperationalError as e:
        # Handle error when the table does not exist
        if "does not exist" in str(e).lower():
            logger.info(f"Table {table_name} does not exist. Assuming first pull.")
            return True
        logger.error(f"Operational Error checking DB status for {table_name}: {e}. Assuming first pull.")
        return True
    except Exception as e:
        logger.error(f"General Error checking DB status for {table_name}: {e}. Assuming first pull.")
        return True

def get_latest_date_in_db(table_name: str) -> Union[str, None]:
    """
    Fetches the latest (MAX) 'date' existing in the given table by joining
    with the dim_date table.
    
    :param table_name: The name of the table to check (either a fact table or dim_date).
    :return: Date in YYYY-MM-DD format or None if the table is empty/does not exist.
    """
    if engine is None or is_first_pull(table_name):
        return None

    query = ""
    if 'fact_' in table_name:
        # For fact tables, join with dim_date to get the actual date
        query = f"""
            SELECT MAX(d.date) 
            FROM "{table_name}" f
            JOIN dim_date d ON f.date_id = d.date_id
        """
    elif table_name == 'dim_date':
        # For the date dimension itself, just get the max date
        query = f'SELECT MAX(date) FROM "{table_name}"'
    else:
        logger.warning(f"get_latest_date_in_db called with non-date table: {table_name}. Skipping.")
        return None

    try:
        with engine.connect() as connection:
            result = connection.execute(text(query)).fetchone()
            
            if result and result[0]:
                date_val = result[0]
                # Ensure the date value is converted to a string in YYYY-MM-DD format
                if isinstance(date_val, (datetime, date)):
                    return date_val.strftime('%Y-%m-%d')
                # If it's already a string (unlikely for a date column MAX), return it
                if isinstance(date_val, str):
                    return date_val
            return None
            
    except Exception as e:
        logger.error(f"Error fetching latest date from {table_name}: {e}")
        return None


def save_dataframe_to_db(df: pd.DataFrame, table_name: str, primary_keys: List[str]) -> bool:
    """
    Saves a DataFrame to a PostgreSQL table using UPSERT (Insert/Update).
    
    Implements strict Primary Key checking to ensure the ON CONFLICT
    clause matches the database's UniqueConstraint exactly.

    :param df: The pandas DataFrame to save.
    :param table_name: The target table name (e.g., 'fact_ad_placement_metrics').
    :param primary_keys: A list of column names that form the unique/primary key 
    :return: True on success, False on failure.
    """
    if engine is None:
        logger.critical("Cannot save data: DB Engine is not initialized.")
        return False
    if df.empty:
        logger.warning(f"Skipping save for {table_name}: DataFrame is empty.")
        return True 

    logger.info(f"Attempting to save {len(df)} rows to table: {table_name} with PK: {primary_keys}...")

    df_filtered = df.copy() # Start with a copy

    # --- Schema Inspection and Column Filtering ---
    try:
        inspector = inspect(engine)
        db_cols = [col['name'] for col in inspector.get_columns(table_name)]
        
        # Start by keeping only the columns present in the DB schema
        df_cols_to_keep = [col for col in df.columns if col in db_cols]
        
        # Ensure all designated primary key columns are *always* kept, even if schema inspection failed/missed them
        for pk in primary_keys:
            if pk in df.columns and pk not in df_cols_to_keep:
                df_cols_to_keep.append(pk)
                logger.warning(
                    f"For {table_name}, mandatory PK column '{pk}' was not returned by DB schema inspection "
                    f"but is being forcefully kept for UPSERT integrity check."
                )

        # Apply the final column filter
        df_filtered = df[df_cols_to_keep]

        dropped_cols = [col for col in df.columns if col not in df_filtered.columns.tolist()]
        if dropped_cols:
             logger.info(f"Filtered DataFrame for {table_name}. Dropped non-schema columns: {dropped_cols}")
        
    except NoSuchTableError:
        # This is expected for the very first pull when the table doesn't exist yet
        logger.warning(f"Table {table_name} not found by inspector. Proceeding without schema validation.")
        df_filtered = df.copy() # Trust the DataFrame for initial load
    except Exception as e:
        logger.error(f"Error during column schema inspection for {table_name}: {e}", exc_info=True)
        df_filtered = df.copy()

    if df_filtered.empty:
        logger.warning(f"Skipping save for {table_name}: DataFrame is empty after schema filtering.")
        return True
    
    # --- DATA CLEANING AND DE-DUPLICATION FIXES ---
    df_clean = df_filtered
    
    # CRITICAL FIX (1): Prevent inserting dimension rows with reserved key ID = 0
    is_dimension_table = table_name.startswith('dim_') and table_name != 'dim_date'
    
    if is_dimension_table:
        id_col_info = UNKNOWN_MEMBER_DEFAULTS.get(table_name)
        
        # Check if the PK column is in the DataFrame. For attribute dims (where ID is dropped), it won't be present.
        if id_col_info and list(id_col_info.keys())[0] in df_clean.columns:
            # The first key in the default row is the surrogate ID (e.g., 'gender_id')
            id_col_name = list(id_col_info.keys())[0] 
            
            initial_count = len(df_clean)
            
            # Filter out rows where the surrogate ID is 0
            df_clean = df_clean[df_clean[id_col_name] != 0].copy()
            
            if len(df_clean) < initial_count:
                logger.warning(
                    f"Filtered out {initial_count - len(df_clean)} rows from {table_name} "
                    f"because {id_col_name}=0, which is reserved for the Unknown Member."
                )
                    
    # Re-check PK presence based on the primary_keys list
    # Use the intersection of user-provided keys and the actual DF columns
    pk_cols_present_in_df = [col for col in primary_keys if col in df_clean.columns]
    
    if not pk_cols_present_in_df:
        logger.error(f"No Primary Key columns found in DataFrame for {table_name} to perform integrity check or UPSERT. Skipping load. Required PKs: {primary_keys}. DF Columns: {df_clean.columns.tolist()}")
        return False
        
    # 1. Integrity Check (Filter out rows where any primary key column is NULL)
    not_null_filter = pd.Series(True, index=df_clean.index)
    
    for col in pk_cols_present_in_df:
        # Check for NaN in PK columns. We allow 0, as 0 is the Unknown Member key in fact tables.
        not_null_filter &= df_clean[col].notna()

    df_pk_valid = df_clean[not_null_filter].copy()
    
    if len(df_clean) != len(df_pk_valid):
        logger.warning(f"Dropped {len(df_clean) - len(df_pk_valid)} rows from {table_name} due to NULL values in mandatory primary key columns: {pk_cols_present_in_df}")
    
    df_to_process = df_pk_valid
    
    if df_to_process.empty:
        logger.warning(f"Skipping save for {table_name}: DataFrame is empty after NULL filtering.")
        return True

    # 2. Cardinality Check (Aggregate fact metrics based on the Primary Key)
    # List of all potential metric columns
    metric_cols_all = ['spend', 'impressions', 'clicks', 'purchases', 'leads', 'ctr', 'cpc', 'cpa_lead', 'cpa_purchase']
    metric_cols_present = [col for col in metric_cols_all if col in df_to_process.columns]

    is_metric_table = bool(metric_cols_present)
    
    df_final_load = df_to_process
    
    if is_metric_table and table_name.startswith('fact_'):
        # For additive fact tables, aggregate metrics by the primary key (the grain)
        agg_funcs = {c: 'sum' for c in metric_cols_present}
        
        group_by_cols = pk_cols_present_in_df
        
        # Identify non-PK, non-metric columns and use 'first' to keep their value (e.g., if there are descriptive attributes in the fact table)
        non_pk_non_metric_cols = [col for col in df_to_process.columns if col not in group_by_cols and col not in metric_cols_present]
        agg_funcs.update({c: 'first' for c in non_pk_non_metric_cols})

        if group_by_cols and (agg_funcs or non_pk_non_metric_cols):
            initial_count = len(df_to_process)
            
            # Perform aggregation
            df_agg = df_to_process.groupby(group_by_cols, dropna=False).agg(agg_funcs).reset_index()
            
            df_final_load = df_agg
            
            if initial_count != len(df_final_load):
                logger.info(f"Aggregated {initial_count - len(df_final_load)} rows in {table_name} to resolve duplicate keys based on grain: {group_by_cols}.")
        
    else:
        # For dimensions or non-additive facts, just enforce uniqueness on the keys passed
        initial_count = len(df_to_process)
        df_final_load = df_to_process.drop_duplicates(subset=pk_cols_present_in_df)
        if initial_count != len(df_final_load):
            logger.info(f"Dropped {initial_count - len(df_final_load)} non-additive duplicate rows in {table_name} based on keys: {pk_cols_present_in_df}.")

    df_to_load = df_final_load
    
    # --- CRITICAL CHECK: Ensure all primary_keys are present for the ON CONFLICT clause ---
    # The final list of columns to use for ON CONFLICT target are the ones present in the DF
    final_pk_cols_for_conflict = pk_cols_present_in_df 
        
    if not final_pk_cols_for_conflict:
          logger.error(
              f"FATAL ETL ERROR: Table '{table_name}' has no columns available to form the UPSERT conflict target. "
              f"Cannot proceed. Required keys: {primary_keys}"
          )
          return False
        
    
    # 2. Build the UPSERT SQL command
    pk_str = ', '.join([f'"{col}"' for col in final_pk_cols_for_conflict])
    
    # Columns to be updated (all non-PK conflict columns from the FINAL DataFrame)
    update_cols = [
        f'"{col}" = EXCLUDED."{col}"' 
        for col in df_to_load.columns 
        if col not in final_pk_cols_for_conflict
    ]
    
    # Use a unique temporary table name
    temp_table_name = table_name + '_temp_' + str(os.getpid())
    
    try:
        # 1. Create a temporary table using the CLEANED, DE-DUPLICATED DataFrame (df_to_load)
        df_to_load.to_sql(temp_table_name, engine, if_exists='replace', index=False, method="multi")
    except Exception as e:
        logger.error(f"Failed to create temporary table {temp_table_name} with cleaned data: {e}", exc_info=True)
        return False


    if not update_cols:
        logger.info(f"Table {table_name} has no non-PK columns to update. Performing INSERT only.")
        update_str = 'DO NOTHING'
    else:
        update_str = 'DO UPDATE SET ' + ', '.join(update_cols)

    # Use the column names from the FINAL DataFrame (df_to_load)
    col_names = ', '.join([f'"{col}"' for col in df_to_load.columns])

    sql_insert_only = f"""
    -- Insert new rows or update existing ones based on the composite key
    INSERT INTO "{table_name}" ({col_names})
    SELECT {col_names}
    FROM "{temp_table_name}"
    ON CONFLICT ({pk_str})
    {update_str};
    """
    
    # --- Execute and Cleanup ---
    try:
        # 3. Execute the UPSERT transaction (Data Load)
        with engine.begin() as connection:
            # SQLAlchemy text() handles the query safely
            connection.execute(text(sql_insert_only)) 
        
        logger.info(f"SUCCESS: {table_name} updated/inserted {len(df_to_load)} rows via UPSERT. Data is committed.")
        return True 

    except Exception as e:
        logger.error(f"DB Error saving {table_name} via UPSERT: {e}", exc_info=True)
        return False

    finally:
        # 4. Cleanup (DROP TEMP)
        try:
            with engine.connect() as connection:
                connection.execute(text(f"DROP TABLE IF EXISTS \"{temp_table_name}\";"))
                connection.commit() 
            logger.debug(f"Cleanup successful: Dropped temporary table {temp_table_name}.")
        except Exception as drop_e:
            logger.warning(f"Cleanup failed (non-fatal): Failed to drop temporary table {temp_table_name}: {drop_e}")


def load_all_fact_tables(
    fact_dfs_dict: Dict[str, pd.DataFrame], 
    fact_table_pks_map: Dict[str, List[str]]
) -> bool:
    """
    Orchestrates the loading of all split fact tables.
    """
    if not fact_dfs_dict:
        logger.info("No DataFrames provided for loading. Skipping fact table load.")
        return True 

    logger.info(f"Starting load process for {len(fact_dfs_dict)} fact tables...")
    
    total_loads = len(fact_dfs_dict)
    total_successful_loads = 0

    for table_name, df in fact_dfs_dict.items():
        if table_name not in fact_table_pks_map:
            logger.error(f"Table name '{table_name}' is not found in the provided Primary Keys map. Skipping.")
            continue
            
        primary_keys = fact_table_pks_map[table_name]
        
        if save_dataframe_to_db(df, table_name, primary_keys):
            total_successful_loads += 1
            
    logger.info(f"Finished loading all fact tables. Successful loads: {total_successful_loads}/{total_loads}")
    return total_successful_loads == total_loads


# --- Function to ensure Unknown Members (Key 0) exist in dimensions ---
# ❗ התיקון הקריטי: שינוי חתימת הפונקציה לקבלת שם טבלה
def ensure_unknown_members_exist(table_name: str) -> None:
    """
    Ensures that the 'Unknown Member' (Surrogate Key 0) exists in the specified
    dimension table (dim_campaign, dim_ad, etc.) to satisfy ForeignKey constraints.
    """
    if engine is None:
        logger.critical("DB Engine is not initialized. Cannot ensure unknown members exist.")
        return
        
    # 1. בדיקה האם שם הטבלה קיים בהגדרות
    if table_name not in UNKNOWN_MEMBER_DEFAULTS:
        logger.warning(
            f"Table '{table_name}' is not configured in UNKNOWN_MEMBER_DEFAULTS. Skipping unknown member check."
        )
        return
        
    # 2. שליפת הנתונים המתאימים לטבלה הספציפית
    default_row = UNKNOWN_MEMBER_DEFAULTS[table_name]
    
    # Get the PK column name (e.g., 'ad_id')
    pk_col = list(default_row.keys())[0] 
    pk_value = default_row[pk_col] # אמור להיות 0
    
    try:
        with engine.begin() as connection:
            # 1. Check if the record with the key (e.g., ad_id=0) already exists
            check_query = text(f'SELECT "{pk_col}" FROM "{table_name}" WHERE "{pk_col}" = :pk_val')
            
            result = connection.execute(check_query, {'pk_val': pk_value}).fetchone()
            
            if result:
                logger.debug(f"Unknown member ({pk_col}={pk_value}) already exists in {table_name}.")
                return # יציאה מהפונקציה אם החבר קיים

            # 2. If it doesn't exist, construct and execute the INSERT query
            columns = ', '.join([f'"{c}"' for c in default_row.keys()])
            placeholders = ', '.join([f':{c}' for c in default_row.keys()])
            
            insert_query = text(f'INSERT INTO "{table_name}" ({columns}) VALUES ({placeholders})')
            
            # Execute with the full default_row dictionary as parameters
            connection.execute(insert_query, default_row)
            logger.info(f"SUCCESS: Inserted Unknown Member ({pk_col}={pk_value}) into {table_name}.")
            
    except Exception as e:
        logger.error(f"CRITICAL ERROR inserting Unknown Member into {table_name}: {e}", exc_info=True)


# --- Foreign Key Pre-Load Logic (Date Dimension) ---
def ensure_dates_exist(dataframe: pd.DataFrame, date_id_column: str = 'date_id') -> None:
    """
    Checks the dim_date table for missing date keys present in the input DataFrame
    and inserts the missing dates before fact table loading begins.
    """
    if engine is None:
        logger.critical("DB Engine is not initialized. Cannot perform dim_date check.")
        return
        
    if dataframe.empty or date_id_column not in dataframe.columns:
        logger.warning("Input DataFrame for dim_date check is empty or missing 'date_id'. Skipping.")
        return

    # 1. Extract unique date IDs from the new fact data (ensure they are Int type for lookup)
    # Use 'Int64' string alias for the nullable integer type
    new_date_ids = dataframe[date_id_column].astype('Int64', errors='ignore').unique()
    # Filter out any lingering NaNs and convert to list of standard Python integers
    new_date_ids = pd.Series(new_date_ids).dropna().astype(int).tolist() 
    
    if not new_date_ids:
        logger.info("No valid date IDs found in the current batch. Skipping dim_date check.")
        return

    logger.info(f"Found {len(new_date_ids)} unique date IDs in the current batch. Checking dim_date...")

    try:
        # 2. Query existing date IDs from dim_date
        with engine.connect() as connection:
            result = connection.execute(text("SELECT date_id FROM dim_date"))
            existing_date_ids = {row[0] for row in result}

        # 3. Identify missing dates
        missing_ids = [
            d_id for d_id in new_date_ids if d_id not in existing_date_ids
        ]

        if not missing_ids:
            logger.info("All required date IDs already exist in dim_date.")
            return

        logger.info(f"Found {len(missing_ids)} missing date IDs that need insertion.")

        # 4. Create DataFrame for missing dates to insert
        missing_dates_to_insert = pd.DataFrame({'date_id': missing_ids})

        # Generate actual date object from the YYYYMMDD integer key
        missing_dates_to_insert['date'] = missing_dates_to_insert['date_id'].astype(str).apply(
            lambda x: datetime.strptime(x, '%Y%m%d').date()
        )
        
        # Populate other dim_date columns (Year, Month, DayOfWeek)
        missing_dates_to_insert['year'] = missing_dates_to_insert['date'].apply(lambda x: x.year)
        missing_dates_to_insert['month'] = missing_dates_to_insert['date'].apply(lambda x: x.month)
        missing_dates_to_insert['day_of_week'] = missing_dates_to_insert['date'].apply(lambda x: x.strftime('%A'))


        # 5. Insert missing dates into dim_date
        with engine.begin() as connection:
            logger.info(f"Inserting {len(missing_ids)} new rows into dim_date...")
            
            # Use 'dim_date' as the table name and 'append' mode is appropriate for adding new distinct keys.
            missing_dates_to_insert.to_sql(
                'dim_date',
                con=connection,
                if_exists='append',
                index=False,
                method='multi' 
            )
            logger.info("Successfully inserted missing dates into dim_date.")

    except Exception as e:
        logger.error(f"CRITICAL ERROR during dim_date pre-load: {e}", exc_info=True)
        # Re-raise to halt the ETL pipeline if date dimension loading fails, as fact loading will definitely fail.
        raise