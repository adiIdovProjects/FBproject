"""
STATIC_DIMENSIONS.PY

Purpose: Central repository for all static dimension data and the specific
loading logic for these dimensions (which do not change based on daily data).

This includes dimensions like:
- Dim Age (predefined ranges)
- Dim Gender (predefined groups)

Also defines the mandatory 'Unknown Member' (Surrogate Key 0) for all dimensions 
to ensure Foreign Key integrity.
"""
import pandas as pd
import logging
from typing import List, Dict, Any

# --- CRITICAL IMPORTS for DB Lookup ---
from data_api.db_connector import save_dataframe_to_db

logger = logging.getLogger(__name__)

# --- STATIC DATA DEFINITIONS ---

# 1. Age Groups (from Meta/Facebook standard)
STATIC_AGE_GROUPS: List[str] = [
    '13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'Unknown'
]

# 2. Gender Groups (from Meta/Facebook standard)
STATIC_GENDER_GROUPS: List[str] = [
    'male', 'female', 'Unknown' # 'Unknown' handles unmapped or NULL values
]

# -------------------------------

# Dictionary defining the Surrogate Key 0 (Unknown Member) for all dimension tables.
# This structure is used by ensure_unknown_members_exist to pre-load key 0.
# The keys in the inner dict must match the target column names in the DB schema.
UNKNOWN_MEMBER_DEFS: Dict[str, Dict[str, Any]] = {
    # ------------------
    # Core Dimensions (must have ID=0 fallback)
    # ------------------
    'dim_campaign': {
        'campaign_id': 0, 
        'campaign_name': 'Unknown Campaign',
    },
    'dim_ad': {
        'ad_id': 0, 
        'ad_name': 'Unknown Ad',
        'ad_link': 'N/A'
    },
    'dim_placement': {
        'placement_id': 0, 
        'placement_name': 'N/A',
        'placement_type': 'Unknown'
    },
    # ------------------
    # Breakdown Dimensions (ID=0 fallback. The static loaders *should* cover this, but we ensure it)
    # ------------------
    'dim_age': {
        'age_id': 0, 
        'age_group': 'N/A' 
    },
    'dim_gender': {
        'gender_id': 0, 
        'gender': 'N/A'
    },
    'dim_country': {
        'country_id': 0, 
        'country_code': 'N/A', 
        'country_name': 'Unknown Country'
    },
}

# --- STATIC LOADER FUNCTIONS ---

def load_dim_age_static() -> bool:
    """
    Loads the static age groups into the dim_age table.
    """
    logger.info("Starting Static Dimension Load: dim_age...")

    try:
        # 1. Create a DataFrame from the static list
        df_age = pd.DataFrame(STATIC_AGE_GROUPS, columns=['age_group'])

        logger.info(f"Loading {len(df_age)} static age groups into dim_age...")

        # 2. Use the existing UPSERT logic. PK is ['age_group']
        success = save_dataframe_to_db(df_age, 'dim_age', ['age_group'])

        if success:
            logger.info("Static Dimension Load (dim_age) completed successfully.")
            return True
        else:
            logger.error("Static Dimension Load (dim_age) failed during DB operation.")
            return False

    except Exception as e:
        logger.error(f"Error loading dim_age static data: {e}", exc_info=True)
        return False


def load_dim_gender_static() -> bool:
    """
    Loads the static gender groups into the dim_gender table.
    """
    logger.info("Starting Static Dimension Load: dim_gender...")

    try:
        # 1. Create a DataFrame from the static list
        df_gender = pd.DataFrame(STATIC_GENDER_GROUPS, columns=['gender'])

        logger.info(f"Loading {len(df_gender)} static gender groups into dim_gender...")

        # 2. Use the existing UPSERT logic. PK is ['gender']

        success = save_dataframe_to_db(df_gender, 'dim_gender', ['gender'])

        if success:
            logger.info("Static Dimension Load (dim_gender) completed successfully.")
            return True
        else:
            logger.error("Static Dimension Load (dim_gender) failed during DB operation.")
            return False

    except Exception as e:
        logger.error(f"Error loading dim_gender static data: {e}", exc_info=True)
        return False