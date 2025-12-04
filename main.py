# main.py

import pandas as pd
from datetime import date
from fb_connector import init_api_connection, get_core_campaign_data, get_breakdown_data
from data_handler import clean_and_calculate
from db_connector import save_dataframe_to_db, is_first_pull, get_latest_date_in_db
from config import (
    FIRST_PULL_DAYS, DAILY_PULL_DAYS,
    CORE_TABLE_NAME, BREAKDOWN_TABLE_NAME,
    CORE_PK, BREAKDOWN_PK, 
    BREAKDOWN_LIST_GROUPS
)
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

# --- הגדרות DB ---
load_dotenv()
DB_USER = os.getenv("POSTGRES_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("POSTGRES_DB")
DB_HOST = os.getenv("POSTGRES_HOST")
DB_PORT = os.getenv("POSTGRES_PORT")
DB_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

try:
    engine = create_engine(DB_URL)
    print(f"✅ SQLAlchemy Engine created and configured.")
except Exception as e:
    engine = None
    print(f"❌ Error creating SQLAlchemy Engine: {e}")

# -----------------------------------------------
# --- פונקציות מבודדות לשליפה ושמירה ל-DB ---
# -----------------------------------------------

def pull_core_data(ad_account_id, days_to_pull):
    """מנהל את ה-Pipeline של נתוני הליבה (Core Data)."""
    
    try:
        # 1. שליפה
        print(f"⏳ Attempting to pull Core Campaign Data for {days_to_pull} days...")
        core_df = get_core_campaign_data(ad_account_id, since_days=days_to_pull)

        if core_df.empty:
            print("🛑 Core Data Pull stopped: No data was fetched.")
            return False

        # 2. עיבוד
        print(f"✅ Core Data cleaned and processed. Rows: {len(core_df)}")
        core_df_processed = clean_and_calculate(core_df, is_core=True)
        
        # 3. שמירה ל-DB
        save_dataframe_to_db(core_df_processed, CORE_TABLE_NAME, CORE_PK)
        return True
    
    except Exception as e:
        print(f"❌ FATAL ERROR in CORE DATA PIPELINE: {e}")
        return False

def pull_breakdown_data(ad_account_id, days_to_pull):
    """מנהל את ה-Pipeline של נתוני הפיצולים (Breakdown Data)."""
    print("\n" + "="*50)
    print("🚀 Starting BREAKDOWN Data Pull and Save")
    print("="*50)
    
    all_breakdowns_dfs = []

    try:
        for group in BREAKDOWN_LIST_GROUPS:
            breakdown_list = group['breakdowns']
            print(f"⏳ Fetching breakdown data by: **{' & '.join(breakdown_list)}**...")
            df_breakdown = get_breakdown_data(ad_account_id, breakdown_list, since_days=days_to_pull)

            if not df_breakdown.empty:
                all_breakdowns_dfs.append(df_breakdown)
        
        if not all_breakdowns_dfs:
            print("⚠️ No breakdown data was fetched or processed.")
            return True

        combined_breakdowns_df = pd.concat(all_breakdowns_dfs, ignore_index=True)

        print(f"🧹 Removing duplicates from breakdown data (Rows before: {len(combined_breakdowns_df)})...")
        initial_rows = len(combined_breakdowns_df)
        
        # הסרת כפילויות לפני עיבוד
        combined_breakdowns_df.drop_duplicates(subset=['date_start', 'campaign_id'] + [col for group in BREAKDOWN_LIST_GROUPS for col in group['breakdowns']], keep='first', inplace=True)
        
        print(f"🧹 Rows after removing duplicates: {len(combined_breakdowns_df)}")
        if len(combined_breakdowns_df) < initial_rows:
            print(f"✅ Successfully removed {initial_rows - len(combined_breakdowns_df)} duplicate rows.")

        # עיבוד וניקוי (כולל יצירת Breakdown_Type)
        combined_breakdowns_df_processed = clean_and_calculate(combined_breakdowns_df, is_core=False)
        
        # שמירה ל-DB
        save_dataframe_to_db(combined_breakdowns_df_processed, BREAKDOWN_TABLE_NAME, BREAKDOWN_PK)
        return True
    
    except Exception as e:
        print(f"❌ FATAL ERROR in BREAKDOWN DATA PIPELINE: {e}")
        return False


def run_daily_data_pipeline():
    """
    פונקציה ראשית המנהלת את לוגיקת הטווח והפעלת ה-Pipelines המבודדים.
    """
    
    # 1. קביעת טווח ימים לשליפה (לוגיקה חכמה)
    is_initial_run = is_first_pull(CORE_TABLE_NAME)

    print(f"\n--- DEBUG: DB Status Check ---")
    print(f"DEBUG: is_initial_run (Table Exists/Populated) = {is_initial_run}")

    days_to_pull = FIRST_PULL_DAYS
    
    if not is_initial_run:
        latest_date_str = get_latest_date_in_db(CORE_TABLE_NAME)
        today_str = date.today().strftime('%Y-%m-%d')

        print(f"DEBUG: Latest date found in DB: {latest_date_str}")
        print(f"DEBUG: Today's date: {today_str}")
        print(f"-----------------------------")

        if latest_date_str is None:
            print(f"⚠️ **DATA INTEGRITY WARNING:** Table exists but latest date is None. Re-fetching ALL {days_to_pull} days to fix integrity.")
        elif latest_date_str != today_str:
            days_to_pull = DAILY_PULL_DAYS
            print(f"🔄 **Daily Update:** DB last date: {latest_date_str}. Fetching the last {days_to_pull} days for update.")
        else:
            print(f"🎉 **Daily Update Skip:** DB is already updated to today ({latest_date_str}). Skipping Meta API pull.")
            return

    elif is_initial_run:
         print(f"🔥 **Initial Run:** Fetching {days_to_pull} days of history.")


    # 2. התחברות ל-API
    ad_account_id, success = init_api_connection()
    if not success:
        return

    # 3. הפעלת הריצות המבודדות - הפעלה מלאה
    print("\n" + "="*50)
    print("🟢 Starting CORE Data Pull and Save")
    print("="*50)
    
    core_success = pull_core_data(ad_account_id, days_to_pull)
    
    if core_success:
        breakdown_success = pull_breakdown_data(ad_account_id, days_to_pull)
    else:
        breakdown_success = False

    # סיכום סופי
    if core_success and breakdown_success:
        print("\n🎉 **SUCCESS:** Pipeline completed successfully for all data streams.")
    else:
        print("\n❌ **FAILURE:** Pipeline finished, but one or more data streams failed to complete.")
        print(f"CORE Success: {core_success}, BREAKDOWN Success: {breakdown_success}")


def main():
    run_daily_data_pipeline()


if __name__ == "__main__":
    main()