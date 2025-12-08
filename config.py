# config.py

from facebook_business.adobjects.adsinsights import AdsInsights

# --- 1. API Credentials (MOVE THESE TO ENVIRONMENT VARIABLES FOR PRODUCTION!) ---
ACCESS_TOKEN = "EAAQwShlYGwkBQLD7vacws4g1uHfoqyyKLpjikjn4l1iW60tgaQOz8H85TbWSezm0xTYmZA6tj16VnegoVCjcc3DX78O4fZAHkFL1tD2JyooVfgouyGnGOMKADE5mRgSeux9kLHgXQQDvgLP7CuutaZBitn9X1bnvytBOZBHaL4tINe7xqANyUiPaK9skDCzEISkZD"
APP_ID = "1178994717760265"
APP_SECRET = "c4d816b4917893d6256ededd124f7fc54c" # Corrected dummy value for demonstration
AD_ACCOUNT_ID = "act_1178994717760265" # Corrected to standard format for demonstration

# --- 2. Gemini Model ---
GEMINI_MODEL = 'gemini-2.5-flash'

# --- 3. DB Settings and Table Names ---
CORE_TABLE_NAME = 'core_campaign_daily'
BREAKDOWN_TABLE_NAME = 'all_breakdowns_daily'

# Primary Keys
CORE_PK = ['Date', 'Campaign_ID']
BREAKDOWN_PK = ['Date', 'Campaign_ID', 'Breakdown_Type', 'age', 'gender', 'country', 'publisher_platform']

# --- 4. Pull Logic Settings ---
FIRST_PULL_DAYS = 1100
DAILY_PULL_DAYS = 3
CHUNK_DAYS = 30 

# --- 5. Meta API Settings ---
# Base fields always pulled
BASE_FIELDS_TO_PULL = [
    AdsInsights.Field.date_start,
    AdsInsights.Field.campaign_id,
    AdsInsights.Field.campaign_name,
    AdsInsights.Field.spend,
    AdsInsights.Field.impressions,
    AdsInsights.Field.clicks,
    AdsInsights.Field.actions,
]

# Breakdown groups to pull
BREAKDOWN_LIST_GROUPS = [
    {'type': 'demo', 'breakdowns': ['age', 'gender']}, 
    {'type': 'geo', 'breakdowns': ['country']},
    {'type': 'placement', 'breakdowns': ['publisher_platform', 'publisher_platform_and_position']}, 
]