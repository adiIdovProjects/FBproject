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
# The following imports require config.py to exist in the environment:
from datetime import date, timedelta
import os
import time
import logging
import concurrent.futures

logger = logging.getLogger(__name__)

# --- Constant settings for handling Rate Limiting ---
MAX_RETRIES = 5
BASE_SLEEP_TIME = 2 
MAX_WORKERS = 5 # Maximum concurrent API calls (adjust based on Meta limits and stability)
# --------------------------------------------



# --- Placeholder/Mock Config values for local debugging ---
# In a real scenario, these come from config.py
try:
    from config import (
    BASE_FIELDS_TO_PULL, 
    CHUNK_DAYS, 
    BREAKDOWN_LIST_GROUPS,
    ACCESS_TOKEN,
    APP_ID,
    APP_SECRET,
    AD_ACCOUNT_ID
)
except ImportError:
    logger.warning("Could not import config.py. Using placeholder values for testing.")
    # Define mock values for testing the structure:
    BASE_FIELDS_TO_PULL = [
        'campaign_id', 'ad_id', 'ad_name', 'spend', 'impressions', 'clicks', 
        AdsInsights.Field.date_start, AdsInsights.Field.date_stop
    ]
    CHUNK_DAYS = 7
    BREAKDOWN_LIST_GROUPS = [['placement']]
# --------------------------------------------------------


def init_api_connection():
    """
    Initializes the connection to the Meta API.
    """
    
    try:
        if not AD_ACCOUNT_ID or not ACCESS_TOKEN or not APP_ID or not APP_SECRET:
            logger.critical("FATAL: One of the FACEBOOK API variables is missing or empty. Please check the config.py file")
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
    # We do not want to pull data up to today itself, as the data is not yet final. We will pull up to yesterday.
    pull_until = today - timedelta(days=1) 
    start_date = today - timedelta(days=since_days)
    
    # Ensure we are not starting to pull from a future date
    if start_date > pull_until:
        return []
        
    chunks = []
    current_start = start_date
    
    while current_start <= pull_until:
        current_end = current_start + timedelta(days=chunk_days - 1)
        if current_end > pull_until:
            current_end = pull_until
            
        # Store index, start, and end for better logging
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
            # The API returns an iterator
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
                # Specific handling for Rate Limiting errors (Code 4)
                if e.api_error_code() == 4:
                    logger.warning(f"Chunk Rate Limit Error (Code 4) on chunk {chunk_index}: Sleeping for {sleep_time}s... (Attempt {retries}/{max_retries})")
                else:
                    api_message = e.body().get('error', {}).get('message', 'N/A')
                    logger.warning(f"Chunk API Error (Status {e.status()}) on chunk {chunk_index}: {api_message}. Retrying in {sleep_time}s... (Attempt {retries}/{max_retries})")
                time.sleep(sleep_time)
            else:
                logger.error(f"Chunk FATAL API Error on chunk {chunk_index} after {max_retries} attempts: {e}", exc_info=True)
                # Return empty list, failure status, and zero rows
                return [], False, 0
                
        except Exception as e:
            logger.critical(f"Chunk CRITICAL UNHANDLED ERROR on chunk {chunk_index}: {e}", exc_info=True)
            # Return empty list, failure status, and zero rows
            return [], False, 0
            
    # Should not be reached, but as fallback, return empty list, failure status, and zero rows
    return [], False, 0


def _fetch_single_chunk(ad_account_id, fields_to_pull, chunk_info, level, breakdowns=None):
    """
    Wrapper function to execute get_insights_for_chunk for use with ThreadPoolExecutor.
    Returns: (chunk_index, data, success, rows_fetched)
    """
    try:
        # Create a new AdAccount object for each worker thread to ensure thread safety
        account = AdAccount(ad_account_id)
        
        start_date = chunk_info['start_date']
        end_date = chunk_info['end_date']
        chunk_index = chunk_info['index']
        
        total_chunks = -1 # Placeholder, will be updated in caller for better progress logging
        
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
        
        # Return tuple: (chunk_index, data, success, rows_fetched)
        return chunk_index, data, success, rows_fetched
    
    except Exception as e:
        chunk_index = chunk_info.get('index', 'UNKNOWN')
        logger.critical(f"Unhandled error in _fetch_single_chunk for index {chunk_index}: {e}", exc_info=True)
        # Return tuple on failure: (chunk_index, empty data, failure, zero rows)
        return chunk_index, [], False, 0


def get_core_campaign_data(ad_account_id, since_days):
    """Fetches core data at the campaign level using parallel execution."""
    
    data_list = []
    
    date_chunks = get_date_chunks(since_days, CHUNK_DAYS)
    total_chunks = len(date_chunks)
    
    if not date_chunks:
        logger.warning("No date range to pull data for (DB is up to date or days_to_pull is too short).")
        return pd.DataFrame() # Ensure DataFrame is returned
    
    fields_to_pull = [field.split('.')[-1] if 'AdsInsights.Field.' in str(field) else field for field in BASE_FIELDS_TO_PULL]
    
    logger.info(f"Starting CORE Campaign data parallel fetch in {total_chunks} chunks using {MAX_WORKERS} workers.")
    
    success_chunks = 0
    failed_chunks = 0
    
    # --- Parallel Execution ---
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        
        # Submit all chunk tasks to the executor
        future_to_chunk = {
            executor.submit(_fetch_single_chunk, ad_account_id, fields_to_pull, chunk, 'ad'): chunk 
            for chunk in date_chunks
        }
        
        # Process results as they complete (in the order they complete, not submission order)
        for future in concurrent.futures.as_completed(future_to_chunk):
            chunk_info = future_to_chunk[future]
            chunk_index = chunk_info['index']
            
            try:
                # result is (chunk_index, data, success, rows_fetched)
                _, chunk_data, success, rows_fetched = future.result()
                
                if success:
                    data_list.extend(chunk_data)
                    success_chunks += 1
                else:
                    failed_chunks += 1
                
                # --- PROGRESS LOGGING ---
                logger.info(
                    f"CORE Pull Progress: Chunk {chunk_index}/{total_chunks} completed. "
                    f"Success: {success_chunks}/{total_chunks} | Total Rows: {len(data_list)}"
                )
                # ------------------------
                
            except Exception as e:
                # This catches exceptions raised during future.result() call
                logger.error(f"Error retrieving result for chunk {chunk_index}: {e}")
                failed_chunks += 1
                
    logger.info(f"Total CORE data fetch completed. Successful Chunks: {success_chunks}/{total_chunks}. Rows: {len(data_list)}.")
    
    # CRITICAL FIX: Always return a DataFrame
    return pd.DataFrame(data_list)


def get_breakdown_data(ad_account_id, breakdowns_list, since_days):
    """
    Fetches data for specific breakdowns using parallel execution.
    :param breakdowns_list: List of breakdown fields (e.g., ['age', 'gender'])
    """
    data_list = []
    
    date_chunks = get_date_chunks(since_days, CHUNK_DAYS)
    total_chunks = len(date_chunks)
    breakdown_name = ' & '.join(breakdowns_list)
    
    if not date_chunks:
        return pd.DataFrame() # Ensure DataFrame is returned

    # Only include the BASE_FIELDS_TO_PULL. Do NOT include the breakdown fields themselves.
    fields_to_pull = [field.split('.')[-1] if 'AdsInsights.Field.' in str(field) else field for field in BASE_FIELDS_TO_PULL]
    
    logger.info(f"Starting Breakdown ({breakdown_name}) parallel fetch in {total_chunks} chunks using {MAX_WORKERS} workers.")

    success_chunks = 0
    failed_chunks = 0
    
    # --- Parallel Execution ---
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        
        # Submit all chunk tasks to the executor
        future_to_chunk = {
            executor.submit(_fetch_single_chunk, ad_account_id, fields_to_pull, chunk, 'ad', breakdowns_list): chunk 
            for chunk in date_chunks
        }
        
        # Process results as they complete
        for future in concurrent.futures.as_completed(future_to_chunk):
            chunk_info = future_to_chunk[future]
            chunk_index = chunk_info['index']
            
            try:
                # result is (chunk_index, data, success, rows_fetched)
                _, chunk_data, success, rows_fetched = future.result()
                
                if success:
                    data_list.extend(chunk_data)
                    success_chunks += 1
                else:
                    failed_chunks += 1
                
                # --- PROGRESS LOGGING ---
                logger.info(
                    f"Breakdown ({breakdown_name}) Pull Progress: Chunk {chunk_index}/{total_chunks} completed. "
                    f"Success: {success_chunks}/{total_chunks} | Total Rows: {len(data_list)}"
                )
                # ------------------------
                
            except Exception as e:
                logger.error(f"Error retrieving result for chunk {chunk_index} for breakdown {breakdown_name}: {e}")
                failed_chunks += 1

    logger.info(f"Total Breakdown data fetch completed ({breakdown_name}). Successful Chunks: {success_chunks}/{total_chunks}. Rows: {len(data_list)}.")
    
    # CRITICAL FIX: Always return a DataFrame
    return pd.DataFrame(data_list)


# ==============================================================================
#                      DEBUG/TEST BLOCK: PLACEMENT PULL
# ==============================================================================

if __name__ == "__main__":
    # הגדרת לוגינג לבדיקה
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    # --- הגדרות לבדיקה ---
    # נמשוך נתונים לשבוע האחרון (שבעה ימים אחורה)
    DEBUG_SINCE_DAYS = 1100
    # אם משתנה הסביבה לא מוגדר, השתמשו במזהה חשבון בדיקה
    DEBUG_AD_ACCOUNT_ID = AD_ACCOUNT_ID 
    # -----------------------

    logger.info(f"--- STARTING PLACEMENT DEBUG PULL ({DEBUG_SINCE_DAYS} DAYS) ---")
    logger.info(f"Fields requested: {', '.join([str(f).split('.')[-1] for f in BASE_FIELDS_TO_PULL])}")
    logger.info(f"Breakdown requested: ['placement']")

    # 1. אימות ואיחול חיבור
    ad_account_id, is_connected = init_api_connection()

    if not is_connected:
        logger.error("Failed to connect to Meta API. Check environment variables (AD_ACCOUNT_ID, ACCESS_TOKEN, etc.).")
    elif ad_account_id != DEBUG_AD_ACCOUNT_ID:
        logger.warning(f"Using Ad Account ID from env: {ad_account_id}")
    else:
        logger.warning("Using placeholder Ad Account ID. Replace 'ACT_YOUR_TEST_AD_ACCOUNT_ID' with a real one.")
        
    if ad_account_id:
        # 2. שליפת הנתונים בפועל רק עם breakdown של 'placement'
        raw_df = get_breakdown_data(
            ad_account_id=ad_account_id,
            breakdowns_list=['placement'],
            since_days=DEBUG_SINCE_DAYS
        )

        print("\n===================================================================")
        if raw_df.empty:
            print("!!! DataFrame ריק. לא נמצאו נתונים עבור המיקומים (Placements) בטווח התאריכים המבוקש.")
            print("ודא שמזהה החשבון נכון, הטווח גדול מספיק, ויש מודעות שרצות.")
        else:
            print(f"נשלפו {len(raw_df)} שורות. בודק עמודת 'placement'...")
            
            # 3. חילוץ והדפסה של 5 הערכים הייחודיים הראשונים
            if 'placement' in raw_df.columns:
                # ניקוי הרווחים וטיפול ב-None לפני חילוץ הייחודיים, כפי שצריך להיעשות ב-T
                unique_placements = raw_df['placement'].astype(str).str.strip().unique()
                
                # סינון ערכי NaN/None שנוצרו מערכים חסרים
                valid_placements = [p for p in unique_placements if p.lower() not in ['nan', 'none', '']]
                
                print(f"נמצאו סה״כ {len(valid_placements)} ערכי מיקום ייחודיים (אחרי ניקוי וסינון NULLs).")
                print("--- 5 הערכים הייחודיים הראשונים שנשלפו (Raw Data) ---")
                
                for i, placement in enumerate(valid_placements[:5]):
                    print(f"{i+1}. '{placement}'")

                if len(valid_placements) > 5:
                    print(f"(... ועוד {len(valid_placements) - 5} מיקומים)")
                    
                if any(" " in p for p in valid_placements):
                    print("\n>> הערה: אם רואים כאן רווחים מיותרים בתוך הערך (למשל 'Instagram Story '), זו לא בעיה, כי הניקוי (.str.strip()) כבר בוצע כדי למנוע כפילויות.")
            else:
                print("!!! העמודה 'placement' אינה קיימת בנתונים שנשלפו! ודא ש-BASE_FIELDS_TO_PULL מכיל שדות חובה, ושה-API החזיר את ה-breakdown.")
        
        print("===================================================================")

    logger.info("--- PLACEMENT DEBUG PULL FINISHED ---")