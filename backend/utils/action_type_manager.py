"""
utils/action_type_manager.py - Manage dim_action_type dimension

This module ensures action types are loaded into the database before fact_action_metrics
"""

import pandas as pd
import logging
from typing import List

logger = logging.getLogger(__name__)

try:
    from config.settings import ACTION_TYPES_TO_TRACK
except ImportError:
    ACTION_TYPES_TO_TRACK = ['purchase', 'lead', 'add_to_cart']


def get_action_types_dataframe() -> pd.DataFrame:
    """
    Create a DataFrame with all tracked action types
    
    Unknown action type should be FIRST (will get ID=1 with auto-increment)
    """
    
    # Start with unknown member
    action_types = ['unknown'] + ACTION_TYPES_TO_TRACK
    
    # Create DataFrame
    df = pd.DataFrame({
        'action_type': action_types,
        'is_conversion': [False] + [True] * len(ACTION_TYPES_TO_TRACK)  # Unknown is not a conversion
    })
    
    # Remove duplicates
    df = df.drop_duplicates(subset=['action_type'])
    
    return df


def ensure_action_types_loaded(engine, df_actions: pd.DataFrame) -> None:
    """
    Ensure all action types from the data are loaded into dim_action_type
    
    Args:
        engine: SQLAlchemy engine
        df_actions: DataFrame with 'action_type' column
    """
    
    from utils.db_utils import save_dataframe
    
    if df_actions.empty or 'action_type' not in df_actions.columns:
        logger.warning("No action types to load")
        return
    
    # Get unique action types from data
    action_types_in_data = df_actions['action_type'].unique().tolist()
    
    # Get all action types (tracked + from data)
    all_action_types = list(set(['unknown'] + ACTION_TYPES_TO_TRACK + action_types_in_data))
    all_action_types.sort()  # Sort for consistency
    
    # Put 'unknown' first
    if 'unknown' in all_action_types:
        all_action_types.remove('unknown')
        all_action_types = ['unknown'] + all_action_types
    
    # Create DataFrame
    df_action_types = pd.DataFrame({
        'action_type': all_action_types,
        'is_conversion': [at != 'unknown' and at in ACTION_TYPES_TO_TRACK for at in all_action_types]
    })
    
    # Save to database
    success = save_dataframe(
        engine,
        df_action_types,
        'dim_action_type',
        ['action_type'],
        is_fact=False
    )
    
    if success:
        logger.info(f"✅ Loaded dim_action_type: {len(df_action_types)} action types")
    else:
        logger.error("❌ Failed to load dim_action_type")