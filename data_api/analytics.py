# ANALYTICS.PY
 
"""
Purpose: Provides functions to query the Star Schema data warehouse (PostgreSQL) 
and generate aggregate reporting DataFrames. It uses SQLAlchemy's engine and 
Pandas to retrieve and process results, including the calculation of final 
presentation KPIs (e.g., CTR, CPC, CPA) directly in the SQL queries.
"""

import pandas as pd
from sqlalchemy import text
# Import engine from the db_connector in the same package
from .db_connector import engine 
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
# --- 1. Core Summary Report (DYNAMIC aggregation for KPIs/Charts) ---
# ----------------------------------------------------------------------

def fetch_core_metrics_summary(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    campaign_name: Optional[str] = None,
    # *** NEW PARAMETER FOR GRANULARITY ***
    granularity: Optional[str] = 'day'
) -> pd.DataFrame:
    """
    Fetches aggregated core metrics GROUPED BY DATE/WEEK/MONTH.
    Calculates CTR, CPC, and CPA.
    """
    if engine is None: 
        logger.error("Database engine is not initialized (engine is None). Check db_connector.py.")
        return pd.DataFrame()

    # Define the grouping column dynamically based on granularity
    if granularity == 'week':
        date_part_sql = "date_trunc('week', dd.date)"
        date_column_name = "week_start_date"
    elif granularity == 'month':
        date_part_sql = "date_trunc('month', dd.date)"
        date_column_name = "month_start_date"
    else: # Default: 'day'
        date_part_sql = "dd.date"
        date_column_name = "date"


    sql_query = f"""
    SELECT
        {date_part_sql} AS "{date_column_name}", -- Dynamic grouping column
        SUM(fcm.spend) AS total_spend,
        SUM(fcm.impressions) AS total_impressions,
        SUM(fcm.clicks) AS total_clicks,
        SUM(fcm.purchases) AS total_purchases,
        -- KPI Calculations (handle division by zero)
        SUM(fcm.clicks)::float / NULLIF(SUM(fcm.impressions), 0) AS "CTR",
        SUM(fcm.spend) / NULLIF(SUM(fcm.clicks), 0) AS "CPC",
        SUM(fcm.spend) / NULLIF(SUM(fcm.purchases), 0) AS "CPA"
    FROM
        fact_core_metrics fcm
    JOIN dim_date dd ON fcm.date_id = dd.date_id
    JOIN dim_campaign dc ON fcm.campaign_id = dc.campaign_id -- JOIN added for campaign_name filtering
    WHERE
        1=1
        {f"AND dd.date >= :start_date" if start_date else ''}
        {f"AND dd.date <= :end_date" if end_date else ''}
        {f"AND dc.campaign_name = :campaign_name" if campaign_name else ''}
    GROUP BY "{date_column_name}" 
    ORDER BY "{date_column_name}";
    """

    params = {}
    if start_date:
        params['start_date'] = start_date
    if end_date:
        params['end_date'] = end_date
    if campaign_name:
        params['campaign_name'] = campaign_name
        
    logger.info(f"Executing query for core summary with granularity: {granularity}. Dates: {start_date} to {end_date}. Params: {params}")
    
    try:
        with engine.connect() as connection:
            df = pd.read_sql(text(sql_query), connection, params=params)
            
            if df.empty:
                 logger.warning(f"Query returned 0 rows for core summary with dates {start_date} to {end_date}. Check your DB data range.")

            # 1. Rename and normalize the date column
            if not df.empty:
                 # date_trunc returns timestamp, normalize and format to YYYY-MM-DD string
                 df[date_column_name] = pd.to_datetime(df[date_column_name]).dt.strftime('%Y-%m-%d')
                 df.rename(columns={date_column_name: 'date'}, inplace=True)
            
            # 2. Rename KPI columns to match frontend expectations (total_ prefixes)
            df.rename(columns={
                'CTR': 'total_ctr',
                'CPC': 'total_cpc',
                'CPA': 'total_cpa',
            }, inplace=True)

            # 3. Handle potential division by zero results (NaN/Inf)
            for col in ['total_ctr', 'total_cpc', 'total_cpa']:
                 if col in df.columns:
                     df[col] = df[col].replace([float('inf'), float('-inf'), None], 0).fillna(0)
                     
            return df
    except Exception as e:
        logger.error(f"FATAL Error executing fetch_core_metrics_summary: {e}", exc_info=True)
        return pd.DataFrame()


# ----------------------------------------------------------------------
# --- 2. Breakdown Reports (Grouped by Dimension) ---
# (The rest of the functions remain the same as the user's uploaded structure)
# ----------------------------------------------------------------------


def fetch_age_gender_breakdown(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    campaign_name: Optional[str] = None
) -> pd.DataFrame:
    """
    Fetches aggregated metrics GROUPED BY Age and Gender.
    """
    if engine is None: 
        logger.error("Database engine is not initialized (engine is None). Check db_connector.py.")
        return pd.DataFrame()
        
    sql_query = f"""
    SELECT
        da.age_range,
        dg.gender_name,
        SUM(fagm.spend) AS total_spend,
        SUM(fagm.impressions) AS total_impressions,
        SUM(fagm.clicks) AS total_clicks,
        SUM(fagm.purchases) AS total_purchases,
        -- KPI Calculations (handle division by zero)
        SUM(fagm.clicks)::float / NULLIF(SUM(fagm.impressions), 0) AS "CTR",
        SUM(fagm.spend) / NULLIF(SUM(fagm.clicks), 0) AS "CPC",
        SUM(fagm.spend) / NULLIF(SUM(fagm.purchases), 0) AS "CPA"
    FROM
        fact_age_gender_metrics fagm
    JOIN dim_age da ON fagm.age_id = da.age_id
    JOIN dim_gender dg ON fagm.gender_id = dg.gender_id
    JOIN dim_campaign dc ON fagm.campaign_id = dc.campaign_id
    JOIN dim_date dd ON fagm.date_id = dd.date_id
    WHERE
        1=1
        {f"AND dd.date >= :start_date" if start_date else ''}
        {f"AND dd.date <= :end_date" if end_date else ''}
        {f"AND dc.campaign_name = :campaign_name" if campaign_name else ''}
    GROUP BY da.age_range, dg.gender_name
    ORDER BY total_spend DESC;
    """

    params = {}
    if start_date:
        params['start_date'] = start_date
    if end_date:
        params['end_date'] = end_date
    if campaign_name:
        params['campaign_name'] = campaign_name
        
    logger.info(f"Executing query for age/gender breakdown. Dates: {start_date} to {end_date}")

    try:
        with engine.connect() as connection:
            df = pd.read_sql(text(sql_query), connection, params=params)
            return df
    except Exception as e:
        logger.error(f"Error executing fetch_age_gender_breakdown: {e}", exc_info=True)
        return pd.DataFrame()


def fetch_country_breakdown(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    campaign_name: Optional[str] = None
) -> pd.DataFrame:
    """
    Fetches aggregated metrics GROUPED BY Country.
    """
    if engine is None: 
        logger.error("Database engine is not initialized (engine is None). Check db_connector.py.")
        return pd.DataFrame()

    sql_query = f"""
    SELECT
        dco.country_name,
        SUM(fcom.spend) AS total_spend,
        SUM(fcom.impressions) AS total_impressions,
        SUM(fcom.clicks) AS total_clicks,
        SUM(fcom.purchases) AS total_purchases,
        -- KPI Calculations (handle division by zero)
        SUM(fcom.clicks)::float / NULLIF(SUM(fcom.impressions), 0) AS "CTR",
        SUM(fcom.spend) / NULLIF(SUM(fcom.clicks), 0) AS "CPC",
        SUM(fcom.spend) / NULLIF(SUM(fcom.purchases), 0) AS "CPA"
    FROM
        fact_country_metrics fcom
    JOIN dim_country dco ON fcom.country_id = dco.country_id
    JOIN dim_campaign dc ON fcom.campaign_id = dc.campaign_id
    JOIN dim_date dd ON fcom.date_id = dd.date_id
    WHERE
        1=1
        {f"AND dd.date >= :start_date" if start_date else ''}
        {f"AND dd.date <= :end_date" if end_date else ''}
        {f"AND dc.campaign_name = :campaign_name" if campaign_name else ''}
    GROUP BY dco.country_name
    ORDER BY total_spend DESC;
    """

    params = {}
    if start_date:
        params['start_date'] = start_date
    if end_date:
        params['end_date'] = end_date
    if campaign_name:
        params['campaign_name'] = campaign_name
        
    logger.info(f"Executing query for country breakdown. Dates: {start_date} to {end_date}")
        
    try:
        with engine.connect() as connection:
            df = pd.read_sql(text(sql_query), connection, params=params)
            return df
    except Exception as e:
        logger.error(f"Error executing fetch_country_breakdown: {e}", exc_info=True)
        return pd.DataFrame()


def fetch_placement_breakdown(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    campaign_name: Optional[str] = None
) -> pd.DataFrame:
    """
    Fetches aggregated metrics GROUPED BY Placement.
    """
    if engine is None: 
        logger.error("Database engine is not initialized (engine is None). Check db_connector.py.")
        return pd.DataFrame()

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
    JOIN dim_date dd ON fpm.date_id = dd.date_id
    WHERE
        1=1
        {f"AND dd.date >= :start_date" if start_date else ''}
        {f"AND dd.date <= :end_date" if end_date else ''}
        {f"AND dc.campaign_name = :campaign_name" if campaign_name else ''}
    GROUP BY dpl.placement_name
    ORDER BY total_spend DESC;
    """

    params = {}
    if start_date:
        params['start_date'] = start_date
    if end_date:
        params['end_date'] = end_date
    if campaign_name:
        params['campaign_name'] = campaign_name
        
    logger.info(f"Executing query for placement breakdown. Dates: {start_date} to {end_date}")

    try:
        with engine.connect() as connection:
            df = pd.read_sql(text(sql_query), connection, params=params)
            return df
    except Exception as e:
        logger.error(f"Error executing fetch_placement_breakdown: {e}", exc_info=True)
        return pd.DataFrame()
        
def fetch_creative_breakdown(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    campaign_name: Optional[str] = None
) -> pd.DataFrame:
    """
    Fetches aggregated core metrics GROUPED BY Creative.
    """
    if engine is None: 
        logger.error("Database engine is not initialized (engine is None). Check db_connector.py.")
        return pd.DataFrame()

    sql_query = f"""
    SELECT
        dcr.creative_name,
        dcr.creative_id, 
        SUM(fcm.spend) AS total_spend,
        SUM(fcm.impressions) AS total_impressions,
        SUM(fcm.clicks) AS total_clicks,
        SUM(fcm.purchases) AS total_purchases,
        -- KPI Calculations (handle division by zero)
        SUM(fcm.clicks)::float / NULLIF(SUM(fcm.impressions), 0) AS "CTR",
        SUM(fcm.spend) / NULLIF(SUM(fcm.clicks), 0) AS "CPC",
        SUM(fcm.spend) / NULLIF(SUM(fcm.purchases), 0) AS "CPA"
    FROM
        fact_core_metrics fcm
    JOIN dim_campaign dc ON fcm.campaign_id = dc.campaign_id
    JOIN dim_creative dcr ON fcm.creative_id = dcr.creative_id
    JOIN dim_date dd ON fcm.date_id = dd.date_id
    WHERE
        1=1
        {f"AND dd.date >= :start_date" if start_date else ''}
        {f"AND dd.date <= :end_date" if end_date else ''}
        {f"AND dc.campaign_name = :campaign_name" if campaign_name else ''}
    GROUP BY dcr.creative_name, dcr.creative_id
    ORDER BY total_spend DESC;
    """

    params = {}
    if start_date:
        params['start_date'] = start_date
    if end_date:
        params['end_date'] = end_date
    if campaign_name:
        params['campaign_name'] = campaign_name
        
    logger.info(f"Executing query for creative breakdown. Dates: {start_date} to {end_date}")

    try:
        with engine.connect() as connection:
            df = pd.read_sql(text(sql_query), connection, params=params)
            return df
    except Exception as e:
        logger.error(f"Error executing fetch_creative_breakdown: {e}", exc_info=True)
        return pd.DataFrame()