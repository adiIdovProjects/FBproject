# fb_connector.py

import pandas as pd
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.exceptions import FacebookRequestError
from config import BASE_FIELDS_TO_PULL, CHUNK_DAYS
from datetime import date, timedelta
import os
import time

# --- קריאה למשתני סביבה גלובליים ---
# הם נטענים מ-os.getenv, אבל נשתמש בטעינה מקומית בתוך הפונקציה init_api_connection
ACCESS_TOKEN = os.getenv("FACEBOOK_ACCESS_TOKEN")
APP_ID = os.getenv("FACEBOOK_APP_ID")
APP_SECRET = os.getenv("FACEBOOK_APP_SECRET")
AD_ACCOUNT_ID = os.getenv("FACEBOOK_AD_ACCOUNT_ID")


# ------------------------------------

def init_api_connection():
    """
    מאתחל את החיבור ל-Meta API, מבצע טעינה מחודשת ובדיקה של משתני הסביבה.
    """
    
    # **תיקון קריטי לבעיית ה-act_None:** טעינה מחדש של הערכים לשימוש מקומי
    
    try:
        if not AD_ACCOUNT_ID or not ACCESS_TOKEN or not APP_ID or not APP_SECRET:
            print("❌ FATAL: אחד ממשתני ה-FACEBOOK API חסר או ריק. אנא בדוק את קובץ .env")
            return None, False
        
        FacebookAdsApi.init(APP_ID, APP_SECRET, ACCESS_TOKEN)
        print("✅ Meta API connection established.")
        
        # הדפסה לווידוא אחרון:
        print(f"DEBUG: Using Ad Account ID: {AD_ACCOUNT_ID}") 
        
        return AD_ACCOUNT_ID, True
    
    except Exception as e:
        print(f"❌ Failed to initialize Meta API: {e}")
        return None, False


def get_date_chunks(since_days, chunk_days):
    """מחלק את טווח הימים לשליפה לנתחים קטנים יותר."""
    today = date.today()
    start_date = today - timedelta(days=since_days)
    chunks = []
    
    current_start = start_date
    while current_start <= today:
        current_end = current_start + timedelta(days=chunk_days - 1)
        if current_end > today:
            current_end = today
            
        chunks.append((current_start.strftime('%Y-%m-%d'), current_end.strftime('%Y-%m-%d')))
        current_start = current_end + timedelta(days=1)
        
    return chunks


def get_core_campaign_data(ad_account_id, since_days):
    """שולף נתוני ליבה ברמת קמפיין."""
    account = AdAccount(f'act_{ad_account_id}') # שימוש במזהה התקין
    data_list = []
    
    date_chunks = get_date_chunks(since_days, CHUNK_DAYS)
    print(f"⏳ Fetching CORE Campaign data in {len(date_chunks)} chunks...")

    for i, (start_date, end_date) in enumerate(date_chunks):
        print(f"  -> Fetching chunk {i+1}/{len(date_chunks)}: {start_date} to {end_date}")
        
        try:
            params = {
                'level': 'campaign',
                'time_increment': 1,
                'time_range': {'since': start_date, 'until': end_date},
                'limit': 1000,
                'fields': [field.split('.')[-1] if 'AdsInsights.Field.' in str(field) else field for field in BASE_FIELDS_TO_PULL],
            }

            insights = account.get_insights(params=params)
            data_list.extend([dict(row) for row in insights])
            
        except FacebookRequestError as e:
            print(f"❌ API Error fetching data chunk ({start_date} - {end_date}): {e.api_error_message()}")
            
        finally:
            # **תיקון: השהיה למניעת שגיאת 403 (Limit Reached)**
            time.sleep(2) 

    if not data_list:
        return pd.DataFrame()

    return pd.DataFrame(data_list)


def get_breakdown_data(ad_account_id, breakdown_list, since_days):
    """שולף נתונים מפולחים (Breakdowns)."""
    account = AdAccount(f'act_{ad_account_id}')
    data_list = []
    date_chunks = get_date_chunks(since_days, CHUNK_DAYS)

    # --- התיקון כאן ---
    # נשתמש רק ב-BASE_FIELDS_TO_PULL עבור ה-fields
    fields_to_pull = BASE_FIELDS_TO_PULL 
    # ------------------
    
    for i, (start_date, end_date) in enumerate(date_chunks):
        try:
            params = {
                'level': 'campaign',
                'time_increment': 1,
                'time_range': {'since': start_date, 'until': end_date},
                'limit': 1000,
                # נשתמש רק בשדות הבסיס (BASE_FIELDS_TO_PULL)
                'fields': [field.split('.')[-1] if 'AdsInsights.Field.' in str(field) else field for field in fields_to_pull],
                # ה-breakdowns נשלחים כפרמטר נפרד
                'breakdowns': breakdown_list,
            }
            insights = account.get_insights(params=params)
            data_list.extend([dict(row) for row in insights])

        except FacebookRequestError as e:
            # מתעלמים משגיאות שקשורות לפיצולים לא נתמכים
            if 'The parameter breakdown is not supported' not in str(e):
                 print(f"❌ API Error fetching breakdown data chunk ({start_date} - {end_date} for {breakdown_list}): {e.api_error_message()}")
            
        finally:
            # **תיקון: השהיה למניעת שגיאת 403 (Limit Reached)**
            time.sleep(2) 
            
    return pd.DataFrame(data_list)