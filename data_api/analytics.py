# data_api/analytics.py

"""
ANALYTICS.PY
 
Purpose: Provides functions to query the Star Schema data warehouse (PostgreSQL) 
and generate aggregate reporting DataFrames. It uses SQLAlchemy's engine and 
Pandas to retrieve and process results, including the calculation of final 
presentation KPIs (e.g., CTR, CPC, CPA) directly in the SQL queries.

Functions:
- fetch_core_metrics_summary: Fetches the daily metrics (used for graphs/KPIs).
- fetch_age_gender_breakdown: Fetches metrics grouped by age and gender.
- fetch_country_breakdown: Fetches metrics grouped by country.
- fetch_placement_breakdown: Fetches metrics grouped by placement.
"""

import pandas as pd
from sqlalchemy import text
# Import engine from the db_connector in the same package
from .db_connector import engine 
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
# --- 1. Core Summary Report (DAILY aggregation for KPIs/Charts) ---
# ----------------------------------------------------------------------

def fetch_core_metrics_summary(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    campaign_name: Optional[str] = None
) -> pd.DataFrame:
    """
    Fetches aggregated core metrics GROUPED BY DATE (for KPI summary and Daily Chart).
    Calculates CTR, CPC, and CPA directly in the SQL query.
    """
    if engine is None:
        logger.critical("DB Engine is not initialized.")
        return pd.DataFrame()

    sql_query = f"""
    SELECT
        dd.date, 
        SUM(fpm.spend) AS total_spend,
        SUM(fpm.impressions) AS total_impressions,
        SUM(fpm.clicks) AS total_clicks,
        SUM(fpm.purchases) AS total_purchases,
        -- KPI Calculations (handle division by zero)
        SUM(fpm.clicks)::float / NULLIF(SUM(fpm.impressions), 0) AS "CTR",
        SUM(fpm.spend) / NULLIF(SUM(fpm.clicks), 0) AS "CPC",
        SUM(fpm.spend) / NULLIF(SUM(fpm.purchases), 0) AS "CPA"
    FROM
        fact_placement_metrics fpm
    JOIN
        dim_date dd ON fpm.date_id = dd.date_id 
    JOIN
        dim_campaign dc ON fpm.campaign_id = dc.campaign_id
    WHERE
        1=1 
        {f"AND fpm.date_id >= :start_date" if start_date else ''}
        {f"AND fpm.date_id <= :end_date" if end_date else ''}
        {f"AND dc.campaign_name = :campaign_name" if campaign_name else ''}
    GROUP BY
        dd.date 
    ORDER BY
        dd.date ASC;
    """
    
    params = {}
    if start_date: params['start_date'] = start_date.replace('-', '')
    if end_date: params['end_date'] = end_date.replace('-', '')
    if campaign_name: params['campaign_name'] = campaign_name
        
    try:
        df = pd.read_sql(text(sql_query), engine, params=params)
        # Fill any NaN/Inf values that might result from nulls with 0
        df.fillna(0, inplace=True)
        return df
    
    except Exception as e:
        logger.error(f"Error fetching core summary: {e}", exc_info=True)
        return pd.DataFrame()

# ----------------------------------------------------------------------
# --- 2. Breakdown Report: Age & Gender ---
# ----------------------------------------------------------------------

def fetch_age_gender_breakdown(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None,
    campaign_name: Optional[str] = None
) -> pd.DataFrame:
    """ 
    Fetches metrics broken down by Age and Gender.
    Calculates CPC and CPA directly in the SQL query.
    """
    if engine is None: return pd.DataFrame()

    sql_query = f"""
    SELECT
        dag.age_group,
        dge.gender,
        SUM(fag.spend) AS total_spend,
        SUM(fag.clicks) AS total_clicks,
        SUM(fag.purchases) AS total_purchases,
        -- KPI Calculations (handle division by zero)
        SUM(fag.spend) / NULLIF(SUM(fag.clicks), 0) AS "CPC",
        SUM(fag.spend) / NULLIF(SUM(fag.purchases), 0) AS "CPA"
    FROM
        fact_age_gender_metrics fag
    JOIN dim_campaign dc ON fag.campaign_id = dc.campaign_id
    JOIN dim_age dag ON fag.age_id = dag.age_id
    JOIN dim_gender dge ON fag.gender_id = dge.gender_id
    WHERE
        1=1
        {f"AND fag.date_id >= :start_date" if start_date else ''}
        {f"AND fag.date_id <= :end_date" if end_date else ''}
        {f"AND dc.campaign_name = :campaign_name" if campaign_name else ''}
    GROUP BY
        dag.age_group, dge.gender
    ORDER BY total_spend DESC;
    """

    params = {}
    if start_date: params['start_date'] = start_date.replace('-', '')
    if end_date: params['end_date'] = end_date.replace('-', '')
    if campaign_name: params['campaign_name'] = campaign_name

    try:
        df = pd.read_sql(text(sql_query), engine, params=params)
        df.fillna(0, inplace=True)
        return df
    except Exception as e:
        logger.error(f"Error fetching age/gender breakdown: {e}", exc_info=True)
        return pd.DataFrame()


# ----------------------------------------------------------------------
# --- 3. Breakdown Report: Country ---
# ----------------------------------------------------------------------

def fetch_country_breakdown(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None,
    campaign_name: Optional[str] = None
) -> pd.DataFrame:
    """ 
    Fetches metrics broken down by Country.
    Calculates CPC and CPA directly in the SQL query.
    """
    if engine is None: return pd.DataFrame()

    sql_query = f"""
    SELECT
        dco.country_code,
        SUM(fcm.spend) AS total_spend,
        SUM(fcm.clicks) AS total_clicks,
        SUM(fcm.purchases) AS total_purchases,
        -- KPI Calculations (handle division by zero)
        SUM(fcm.spend) / NULLIF(SUM(fcm.clicks), 0) AS "CPC",
        SUM(fcm.spend) / NULLIF(SUM(fcm.purchases), 0) AS "CPA"
    FROM
        fact_country_metrics fcm
    JOIN dim_campaign dc ON fcm.campaign_id = dc.campaign_id
    JOIN dim_country dco ON fcm.country_id = dco.country_id
    WHERE
        1=1
        {f"AND fcm.date_id >= :start_date" if start_date else ''}
        {f"AND fcm.date_id <= :end_date" if end_date else ''}
        {f"AND dc.campaign_name = :campaign_name" if campaign_name else ''}
    GROUP BY dco.country_code
    ORDER BY total_spend DESC;
    """

    params = {}
    if start_date: params['start_date'] = start_date.replace('-', '')
    if end_date: params['end_date'] = end_date.replace('-', '')
    if campaign_name: params['campaign_name'] = campaign_name

    try:
        df = pd.read_sql(text(sql_query), engine, params=params)
        df.fillna(0, inplace=True)
        return df
    except Exception as e:
        logger.error(f"Error fetching country breakdown: {e}", exc_info=True)
        return pd.DataFrame()

# ----------------------------------------------------------------------
# --- 4. Breakdown Report: Placement ---
# ----------------------------------------------------------------------

def fetch_placement_breakdown(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None,
    campaign_name: Optional[str] = None
) -> pd.DataFrame:
    """ 
    Fetches metrics broken down by Placement.
    Calculates CTR, CPC, and CPA directly in the SQL query.
    """
    if engine is None: return pd.DataFrame()

    sql_query = f"""
    SELECT
        dpl.placement_name,
        SUM(fpm.spend) AS total_spend,
        SUM(fpm.impressions) AS total_impressions,
        SUM(fpm.clicks) AS total_clicks,
        SUM(fpm.purchases) AS total_purchases,
        -- KPI Calculations (handle division by zero)
        SUM(fpm.clicks)::float / NULLIF(SUM(fpm.impressions), 0) AS "CTR",
        SUM(fpm.spend) / NULLIF(SUM(fpm.clicks), 0) AS "CPC",
        SUM(fpm.spend) / NULLIF(SUM(fpm.purchases), 0) AS "CPA"
    FROM
        fact_placement_metrics fpm
    JOIN dim_campaign dc ON fpm.campaign_id = dc.campaign_id
    JOIN dim_placement dpl ON fpm.placement_id = dpl.placement_id
    WHERE
        1=1
        {f"AND fpm.date_id >= :start_date" if start_date else ''}
        {f"AND fpm.date_id <= :end_date" if end_date else ''}
        {f"AND dc.campaign_name = :campaign_name" if campaign_name else ''}
    GROUP BY dpl.placement_name
    ORDER BY total_spend DESC;
    """

    params = {}
    if start_date: params['start_date'] = start_date.replace('-', '')
    if end_date: params['end_date'] = end_date.replace('-', '')
    if campaign_name: params['campaign_name'] = campaign_name

    try:
        df = pd.read_sql(text(sql_query), engine, params=params)
        df.fillna(0, inplace=True)
        return df
    except Exception as e:
        logger.error(f"Error fetching placement breakdown: {e}", exc_info=True)
        return pd.DataFrame()