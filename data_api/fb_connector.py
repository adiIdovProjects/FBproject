"""
FB_CONNECTOR.PY

Purpose: Handles the Extract (E) step of the ETL process. It connects to the 
Facebook/Meta Marketing API and pulls campaign/ad insights data, including 
core metrics and breakdowns, while implementing rate limiting retry logic.

Key Fix: 
- Ensured that both get_core_campaign_data and get_breakdown_data always return 
  a Pandas DataFrame object, even if empty, to prevent AttributeError: 'dict' 
  object has no attribute 'shape' in the calling script.
- Simplified the progress logging structure within the concurrent loop for stability.

Functions:
- init_api_connection: Initializes the Facebook Ads API connection.
- get_date_chunks: Splits the required date range into smaller chunks for fetching.
- get_insights_for_chunk: Helper to execute the API call with robust retry logic.
- _fetch_single_chunk: Wrapper for parallel execution logic.
- get_core_campaign_data: Fetches the primary campaign/ad metrics data in parallel.
- get_breakdown_data: Fetches data for specific breakdowns in parallel.
"""

import pandas as pd
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adsinsights import AdsInsights
from facebook_business.exceptions import FacebookRequestError
from config import BASE_FIELDS_TO_PULL, CHUNK_DAYS, BREAKDOWN_LIST_GROUPS
from datetime import date, timedelta
import os
import time
import logging
import concurrent.futures

logger = logging.getLogger(__name__)

# --- Constant settings for handling Rate Limiting ---
MAX_RETRIES = 5
BASE_SLEEP_TIME = 2 
MAX_WORKERS = 5
# --------------------------------------------

# --- Read global environment variables ---
ACCESS_TOKEN = os.getenv("FACEBOOK_ACCESS_TOKEN")
APP_ID = os.getenv("FACEBOOK_APP_ID")
APP_SECRET = os.getenv("FACEBOOK_APP_SECRET")
AD_ACCOUNT_ID = os.getenv("FACEBOOK_AD_ACCOUNT_ID")


def init_api_connection():
    """Initializes the connection to the Meta API."""
    try:
        if not AD_ACCOUNT_ID or not ACCESS_TOKEN or not APP_ID or not APP_SECRET:
            logger.critical("FATAL: One of the FACEBOOK API variables is missing or empty. Please check the .env file")
            return None, False
        
        FacebookAdsApi.init(APP_ID, APP_SECRET, ACCESS_TOKEN)
        logger.info("Meta API connection established.")
        
        logger.debug(f"Using Ad Account ID: {AD_ACCOUNT_ID}")
        
        return AD_ACCOUNT_ID, True
    
    except Exception as e:
        logger.error(f"Failed to initialize Meta API: {e}")
        return None, False


def get_date_chunks(since_days, chunk_days):
    """Splits the date range for fetching into smaller chunks."""
    today = date.today()
    pull_until = today - timedelta(days=1) 
    start_date = today - timedelta(days=since_days)
    
    if start_date > pull_until:
        return []
        
    chunks = []
    current_start = start_date
    
    while current_start <= pull_until:
        current_end = current_start + timedelta(days=chunk_days - 1)
        if current_end > pull_until:
            current_end = pull_until
            
        chunk_index = len(chunks) + 1
        chunks.append({
            'index': chunk_index,
            'start_date': current_start.strftime('%Y-%m-%d'),
            'end_date': current_end.strftime('%Y-%m-%d')
        })
        current_start = current_end + timedelta(days=1)
        
    return chunks


def get_insights_for_chunk(account, params, fields, chunk_index, total_chunks, max_retries):
    """
    Helper function to fetch insights for a single chunk with retry logic.
    Returns: list of dicts (data), boolean (success status), int (rows fetched)
    """
    
    retries = 0
    success = False

    while retries < max_retries and not success:
        try:
            insights = account.get_insights(
                fields=fields, 
                params=params
            )
            
            temp_data = [dict(row) for row in insights]
            rows_fetched = len(temp_data)
            
            logger.debug(f"Chunk Success ({chunk_index}/{total_chunks}): Fetched {rows_fetched} rows.")
            
            return temp_data, True, rows_fetched
        
        except FacebookRequestError as e:
            retries += 1
            if retries < max_retries:
                sleep_time = BASE_SLEEP_TIME * (2 ** retries)
                if e.api_error_code() == 4:
                    logger.warning(f"Chunk Rate Limit Error (Code 4) on chunk {chunk_index}: Sleeping for {sleep_time}s... (Attempt {retries}/{max_retries})")
                else:
                    api_message = e.body().get('error', {}).get('message', 'N/A')
                    logger.warning(f"Chunk API Error (Status {e.api_status()}) on chunk {chunk_index}: {api_message}. Retrying in {sleep_time}s... (Attempt {retries}/{max_retries})")
                time.sleep(sleep_time)
            else:
                logger.error(f"Chunk FATAL API Error on chunk {chunk_index} after {max_retries} attempts: {e}", exc_info=True)
                return [], False, 0
        
        except Exception as e:
            logger.critical(f"Chunk CRITICAL UNHANDLED ERROR on chunk {chunk_index}: {e}", exc_info=True)
            return [], False, 0
    
    return [], False, 0


def _fetch_single_chunk(ad_account_id, fields_to_pull, chunk_info, level, breakdowns=None):
    try:
        account = AdAccount(f'act_{ad_account_id}')
        
        start_date = chunk_info['start_date']
        end_date = chunk_info['end_date']
        chunk_index = chunk_info['index']
        
        total_chunks = -1
        
        params = {
            'level': level, 
            'time_increment': 1,
            'time_range': {'since': start_date, 'until': end_date},
            'limit': 1000,
        }
        
        if breakdowns:
            params['breakdowns'] = breakdowns

        data, success, rows_fetched = get_insights_for_chunk(
            account=account, 
            params=params, 
            fields=fields_to_pull, 
            chunk_index=chunk_index, 
            total_chunks=total_chunks, 
            max_retries=MAX_RETRIES
        )
        
        return chunk_index, data, success, rows_fetched
    
    except Exception as e:
        chunk_index = chunk_info.get('index', 'UNKNOWN')
        logger.critical(f"Unhandled error in _fetch_single_chunk for index {chunk_index}: {e}", exc_info=True)
        return chunk_index, [], False, 0


def get_core_campaign_data(ad_account_id, since_days):
    data_list = []
    
    date_chunks = get_date_chunks(since_days, CHUNK_DAYS)
    total_chunks = len(date_chunks)
    
    if not date_chunks:
        logger.warning("No date range to pull data for.")
        return pd.DataFrame()
    
    fields_to_pull = [field.split('.')[-1] if 'AdsInsights.Field.' in str(field) else field for field in BASE_FIELDS_TO_PULL]
    
    logger.info(f"Starting CORE Campaign data parallel fetch in {total_chunks} chunks using {MAX_WORKERS} workers.")
    
    success_chunks = 0
    failed_chunks = 0
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        
        future_to_chunk = {
            executor.submit(_fetch_single_chunk, ad_account_id, fields_to_pull, chunk, 'ad'): chunk 
            for chunk in date_chunks
        }
        
        for future in concurrent.futures.as_completed(future_to_chunk):
            chunk_info = future_to_chunk[future]
            chunk_index = chunk_info['index']
            
            try:
                _, chunk_data, success, rows_fetched = future.result()
                
                if success:
                    data_list.extend(chunk_data)
                    success_chunks += 1
                else:
                    failed_chunks += 1
                
                logger.info(
                    f"CORE Pull Progress: Chunk {chunk_index}/{total_chunks} completed. "
                    f"Success: {success_chunks}/{total_chunks} | Total Rows: {len(data_list)}"
                )
                
            except Exception as e:
                logger.error(f"Error retrieving result for chunk {chunk_index}: {e}")
                failed_chunks += 1
        
    logger.info(f"Total CORE data fetch completed. Successful Chunks: {success_chunks}/{total_chunks}. Rows: {len(data_list)}.")
    
    return pd.DataFrame(data_list)


def get_breakdown_data(ad_account_id, breakdowns_list, since_days):
    data_list = []
    
    date_chunks = get_date_chunks(since_days, CHUNK_DAYS)
    total_chunks = len(date_chunks)
    breakdown_name = ' & '.join(breakdowns_list)
    
    if not date_chunks:
        return pd.DataFrame()

    fields_to_pull = [field.split('.')[-1] if 'AdsInsights.Field.' in str(field) else field for field in BASE_FIELDS_TO_PULL]
    
    logger.info(f"Starting Breakdown ({breakdown_name}) parallel fetch in {total_chunks} chunks using {MAX_WORKERS} workers.")

    success_chunks = 0
    failed_chunks = 0
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        
        future_to_chunk = {
            executor.submit(_fetch_single_chunk, ad_account_id, fields_to_pull, chunk, 'ad', breakdowns_list): chunk 
            for chunk in date_chunks
        }
        
        for future in concurrent.futures.as_completed(future_to_chunk):
            chunk_info = future_to_chunk[future]
            chunk_index = chunk_info['index']
            
            try:
                _, chunk_data, success, rows_fetched = future.result()
                
                if success:
                    data_list.extend(chunk_data)
                    success_chunks += 1
                else:
                    failed_chunks += 1
                
                logger.info(
                    f"Breakdown ({breakdown_name}) Pull Progress: Chunk {chunk_index}/{total_chunks} completed. "
                    f"Success: {success_chunks}/{total_chunks} | Total Rows: {len(data_list)}"
                )
                
            except Exception as e:
                logger.error(f"Error retrieving result for chunk {chunk_index} for breakdown {breakdown_name}: {e}")
                failed_chunks += 1

    logger.info(f"Total Breakdown data fetch completed ({breakdown_name}). Successful Chunks: {success_chunks}/{total_chunks}. Rows: {len(data_list)}.")
    
    return pd.DataFrame(data_list)
