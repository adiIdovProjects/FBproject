from facebook_business.adobjects.adsinsights import AdsInsights


# --- 2. Gemini Model ---
GEMINI_MODEL = 'gemini-2.5-flash'

# --- 3. DB Settings and Table Names ---
CORE_TABLE_NAME = 'core_campaign_daily'
BREAKDOWN_TABLE_NAME = 'all_breakdowns_daily'

# Primary Keys
CORE_PK = ['Date', 'Campaign_ID']
BREAKDOWN_PK = ['Date', 'Campaign_ID', 'Breakdown_Type', 'age', 'gender', 'country', 'publisher_platform']

# Fact Table Composite Primary Keys (Used for UPSERT logic in db_connector.py)
# These must match the unique constraints defined in db_schema.py
FACT_TABLE_PKS = {
    'fact_core_metrics': ['date_id', 'campaign_id', 'adset_id', 'ad_id'],
    'fact_placement_metrics': ['date_id', 'campaign_id', 'adset_id', 'ad_id', 'placement_id'],
    'fact_age_gender_metrics': ['date_id', 'campaign_id', 'adset_id', 'ad_id', 'age_id', 'gender_id'],
    'fact_country_metrics': ['date_id', 'campaign_id', 'adset_id', 'ad_id', 'country_id'],
}

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
    AdsInsights.Field.adset_id,      
    AdsInsights.Field.adset_name,   
    AdsInsights.Field.ad_id,         
    AdsInsights.Field.ad_name,       
    AdsInsights.Field.spend,
    AdsInsights.Field.impressions,
    AdsInsights.Field.clicks,
    AdsInsights.Field.actions,
]

# Breakdown groups to pull
BREAKDOWN_LIST_GROUPS = [
    {'type': 'demo', 'breakdowns': ['age', 'gender']}, 
    {'type': 'geo', 'breakdowns': ['country']},
    {'type': 'placement', 'breakdowns': ['publisher_platform']}, 
]