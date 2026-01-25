"""
utils/db_utils.py - Database utilities (connection, UPSERT, lookups)
FIXED: Properly handle unknown members for auto-increment dimension tables
"""

import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, IntegrityError
from dotenv import load_dotenv
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

from backend.config.base_config import settings

# Global lookup cache
LOOKUP_CACHE: Dict[str, Dict[str, int]] = {}

def get_db_engine():
    """Create and return SQLAlchemy engine with optimized pool settings"""

    try:
        engine = create_engine(
            settings.DATABASE_URL,
            pool_size=20,          # Base number of connections to keep open
            max_overflow=40,       # Allow up to 60 total connections under load
            pool_timeout=30,       # Wait up to 30s for a connection
            pool_recycle=3600,     # Recycle connections after 1 hour
            pool_pre_ping=True     # Test connections before use
        )
        logger.info("✅ Database engine created successfully")
        return engine
    except Exception as e:
        logger.error(f"Failed to create database engine: {e}")
        raise


def get_latest_date_in_db(engine, table_name: str) -> Optional[str]:
    """Get the latest date in a fact table"""
    
    try:
        query = text(f"""
            SELECT MAX(d.date) as max_date
            FROM {table_name} f
            JOIN dim_date d ON f.date_id = d.date_id
        """)
        
        with engine.connect() as conn:
            result = conn.execute(query).fetchone()
            if result and result[0]:
                return result[0].strftime('%Y-%m-%d')
    except Exception as e:
        logger.warning(f"Could not get latest date from {table_name}: {e}")
    
    return None


def ensure_unknown_members(engine, table_name: str, default_values: Dict[str, Any]):
    """
    Ensure unknown member exists in dimension table
    
    For auto-increment tables (age, gender, country, placement, action_type):
    - These tables use auto-increment starting from 1
    - Unknown member should be inserted FIRST to get ID=1
    - We DON'T force ID=0 because that breaks auto-increment
    
    For non-auto-increment tables (account, campaign, adset, ad, creative, date):
    - These use actual IDs from Facebook (BigInteger)
    - Unknown member uses ID=0
    """
    
    # Determine if this is an auto-increment table
    auto_increment_tables = ['dim_age', 'dim_gender', 'dim_country', 'dim_placement', 'dim_action_type']
    is_auto_increment = table_name in auto_increment_tables
    
    try:
        # Get the primary key column and value
        pk_col = list(default_values.keys())[0]
        pk_val = default_values[pk_col]
        
        if is_auto_increment:
            # For auto-increment tables, check if table is empty
            # If empty, insert will get ID=1 automatically
            # If not empty, check if the first member is the Unknown member
            
            count_query = text(f'SELECT COUNT(*) FROM "{table_name}"')
            
            with engine.connect() as conn:
                result = conn.execute(count_query).fetchone()
                count = result[0]
                
                if count == 0:
                    # Table is empty - insert Unknown member (will get ID=1)
                    # Don't specify the ID column - let auto-increment handle it
                    insert_cols = [k for k in default_values.keys() if not k.endswith('_id')]
                    insert_values = {k: v for k, v in default_values.items() if not k.endswith('_id')}
                    
                    df_unknown = pd.DataFrame([insert_values])
                    df_unknown.to_sql(table_name, engine, if_exists='append', index=False)
                    logger.info(f"✅ Inserted Unknown member into {table_name} (will have ID=1)")
                else:
                    logger.debug(f"Table {table_name} already has data")
        else:
            # For non-auto-increment tables, check if ID=0 exists
            query = text(f'SELECT COUNT(*) FROM "{table_name}" WHERE "{pk_col}" = :pk_val')
            
            with engine.connect() as conn:
                result = conn.execute(query, {'pk_val': pk_val}).fetchone()
                
                if result[0] == 0:
                    # Insert unknown member with ID=0
                    df_unknown = pd.DataFrame([default_values])
                    df_unknown.to_sql(table_name, engine, if_exists='append', index=False)
                    logger.info(f"✅ Inserted unknown member into {table_name} (ID=0)")
                else:
                    logger.debug(f"Unknown member already exists in {table_name}")
    
    except Exception as e:
        logger.error(f"Error ensuring unknown member in {table_name}: {e}")


def clear_fact_data(engine, table_names: list, start_date_id: int, end_date_id: int):
    """
    Delete data from fact tables for a specific date range.
    This ensures idempotency when re-running the ETL.
    """
    if not table_names:
        return True
        
    try:
        with engine.begin() as conn:
            for table in table_names:
                query = text(f"""
                    DELETE FROM "{table}" 
                    WHERE date_id >= :start_id AND date_id <= :end_id
                """)
                result = conn.execute(query, {"start_id": start_date_id, "end_id": end_date_id})
                logger.info(f"🗑️ Cleared {result.rowcount} rows from {table} for range {start_date_id}-{end_date_id}")
        return True
    except Exception as e:
        logger.error(f"Error clearing fact data: {e}")
        return False


def save_dataframe(engine, df: pd.DataFrame, table_name: str, pk_columns: list, is_fact: bool = False) -> bool:
    """
    Save DataFrame to database using UPSERT strategy
    
    Args:
        engine: SQLAlchemy engine
        df: DataFrame to save
        table_name: Target table name
        pk_columns: List of primary key columns
        is_fact: True if fact table (DO NOTHING), False if dimension (DO UPDATE)
    
    Returns:
        True if successful, False otherwise
    """
    
    if df.empty:
        logger.warning(f"Skipping {table_name}: DataFrame is empty")
        return True
    
    df_to_save = df.copy()

    for col in df_to_save.columns:
        if col.endswith('_id'):
            def to_int_safe(val):
                if pd.isna(val) or str(val).strip() in ['', '0', '0.0', 'None', 'nan']:
                    return 0
                try:
                    # Handles scientific notation if it exists, but avoids float precision loss
                    s = str(val).split('.')[0].strip()
                    return int(s)
                except:
                    return 0
            df_to_save[col] = df_to_save[col].apply(to_int_safe).astype(np.int64)
            
    # Filter out NULL primary keys and de-duplicate to avoid CardinalityViolation
    df_filtered = df_to_save.dropna(subset=pk_columns).drop_duplicates(subset=pk_columns)
    
    if df_filtered.empty:
        logger.warning(f"Skipping {table_name}: All rows have NULL primary keys or were duplicates")
        return True
    
    temp_table = f"{table_name}_temp_{os.getpid()}"
    
    try:
        with engine.begin() as conn:
            # Load to temp table
            df_filtered.to_sql(temp_table, conn, if_exists='replace', index=False)
            logger.info(f"Loaded {len(df_filtered)} rows to temp table {temp_table}")
            
            # Build UPSERT query
            all_cols = list(df_filtered.columns)
            pk_cols_str = ', '.join(f'"{col}"' for col in pk_columns)
            all_cols_str = ', '.join(f'"{col}"' for col in all_cols)
            
            if is_fact:
                # Fact tables: DO NOTHING on conflict
                upsert_query = f"""
                    INSERT INTO "{table_name}" ({all_cols_str})
                    SELECT {all_cols_str}
                    FROM "{temp_table}"
                    ON CONFLICT ({pk_cols_str})
                    DO NOTHING;
                """
            else:
                # Dimension tables: DO UPDATE on conflict
                update_cols = [col for col in all_cols if col not in pk_columns]
                
                if update_cols:
                    update_set_str = ', '.join(f'"{col}" = EXCLUDED."{col}"' for col in update_cols)
                    upsert_query = f"""
                        INSERT INTO "{table_name}" ({all_cols_str})
                        SELECT {all_cols_str}
                        FROM "{temp_table}"
                        ON CONFLICT ({pk_cols_str})
                        DO UPDATE SET {update_set_str};
                    """
                else:
                    # No columns to update (only PK)
                    upsert_query = f"""
                        INSERT INTO "{table_name}" ({all_cols_str})
                        SELECT {all_cols_str}
                        FROM "{temp_table}"
                        ON CONFLICT ({pk_cols_str})
                        DO NOTHING;
                    """
            
            # Execute UPSERT
            result = conn.execute(text(upsert_query))
            rows_affected = result.rowcount
            
            logger.info(f"✅ {table_name}: {rows_affected} rows upserted")
            
            # Cleanup temp table
            conn.execute(text(f'DROP TABLE IF EXISTS "{temp_table}"'))
            
            return True
    
    except IntegrityError as e:
        logger.error(f"Integrity error saving {table_name}: {e}")
        return False
    except Exception as e:
        logger.error(f"Error saving {table_name}: {e}", exc_info=True)
        return False


def load_lookup_cache(engine):
    """
    Load attribute dimension lookups into memory cache
    
    This maps dimension names to IDs for fast fact table loading
    
    IMPORTANT: For auto-increment dimensions, Unknown member will have ID=1, not ID=0
    """
    
    global LOOKUP_CACHE
    LOOKUP_CACHE.clear()
    
    lookups = {
        'dim_age': ('age_group', 'age_id'),
        'dim_gender': ('gender', 'gender_id'),
        'dim_country': ('country', 'country_id'),
        'dim_placement': ('placement_name', 'placement_id'),
        'dim_action_type': ('action_type', 'action_type_id'),
    }
    
    for table_name, (name_col, id_col) in lookups.items():
        try:
            query = text(f'SELECT "{id_col}", "{name_col}" FROM "{table_name}"')
            
            with engine.connect() as conn:
                df = pd.read_sql(query, conn)
            
            if not df.empty:
                # Create lookup dict: {name: id}
                lookup = dict(zip(df[name_col], df[id_col]))
                LOOKUP_CACHE[table_name] = lookup
                logger.info(f"Loaded {len(lookup)} mappings for {table_name}")
            else:
                LOOKUP_CACHE[table_name] = {}
        
        except Exception as e:
            logger.warning(f"Could not load lookup for {table_name}: {e}")
            LOOKUP_CACHE[table_name] = {}
    
    logger.info(f"✅ Lookup cache loaded: {len(LOOKUP_CACHE)} dimensions")


def _convert_numpy_types(df: pd.DataFrame) -> pd.DataFrame:
    """Convert numpy types to native Python types"""
    
    df_copy = df.copy()
    
    for col in df_copy.columns:
        if df_copy[col].dtype in (np.int64, np.int32, np.int16):
            df_copy[col] = df_copy[col].astype('Int64')  # Nullable integer
        elif df_copy[col].dtype in (np.float64, np.float32):
            df_copy[col] = df_copy[col].astype(float)
    
    return df_copy