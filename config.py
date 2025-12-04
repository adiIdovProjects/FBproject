# config.py

from facebook_business.adobjects.adsinsights import AdsInsights

# --- 1. הגדרות API ו-Gemini ---
GEMINI_MODEL = 'gemini-2.5-flash'

# --- 2. הגדרות DB ושמות טבלאות ---
CORE_TABLE_NAME = 'core_campaign_daily'
BREAKDOWN_TABLE_NAME = 'all_breakdowns_daily'

# מפתחות ראשיים (Primary Keys)
CORE_PK = ['Date', 'Campaign_ID']

# **תיקון 4:** הוספת עמודות הפיצול למפתח הראשי
BREAKDOWN_PK = ['Date', 'Campaign_ID', 'Breakdown_Type', 'age', 'gender', 'country', 'publisher_platform']


# --- 3. הגדרות לוגיקת שליפה (PULL LOGIC) ---
FIRST_PULL_DAYS = 1100
DAILY_PULL_DAYS = 3
CHUNK_DAYS = 30 

# --- 4. הגדרות Meta API ---
# רשימת השדות הבסיסית שנשלפת תמיד
BASE_FIELDS_TO_PULL = [
    AdsInsights.Field.date_start,
    AdsInsights.Field.campaign_id,
    # **תיקון 5:** הוספת campaign_name לשליפה
    AdsInsights.Field.campaign_name, 
    AdsInsights.Field.spend,
    AdsInsights.Field.impressions,
    AdsInsights.Field.clicks,
    # הסרנו ctr, כי נחשב אותו ב-data_handler
    AdsInsights.Field.actions,
]

# רשימת קבוצות הפיצולים לשליפה
BREAKDOWN_LIST_GROUPS = [
    {'type': 'demo', 'breakdowns': ['age', 'gender']}, 
    {'type': 'geo', 'breakdowns': ['country']},
    {'type': 'placement', 'breakdowns': ['publisher_platform']}, 
]