"""
config/settings.py - Main Configuration
All business logic and constants in one place
"""

from facebook_business.adobjects.adsinsights import AdsInsights

# ==============================================================================
# FACEBOOK API FIELDS
# ==============================================================================

BASE_FIELDS_TO_PULL = [
    AdsInsights.Field.date_start,
    AdsInsights.Field.campaign_id,
    AdsInsights.Field.adset_id,
    AdsInsights.Field.ad_id,
    AdsInsights.Field.account_id,
    
    # Core Performance - Multiple click fields for fallback
    AdsInsights.Field.spend,
    AdsInsights.Field.impressions,
    AdsInsights.Field.clicks,  # Link clicks (all)
    AdsInsights.Field.inline_link_clicks,  # CRITICAL: Most reliable for link clicks
    AdsInsights.Field.outbound_clicks,  # Fallback for outbound traffic

    # Conversions (critical)
    AdsInsights.Field.actions,
    AdsInsights.Field.action_values,
    AdsInsights.Field.cost_per_action_type,

    # Video Metrics (if you run video ads)
    AdsInsights.Field.video_play_actions,
    AdsInsights.Field.video_p25_watched_actions,
    AdsInsights.Field.video_p50_watched_actions,
    AdsInsights.Field.video_p75_watched_actions,
    AdsInsights.Field.video_p100_watched_actions,
    AdsInsights.Field.video_avg_time_watched_actions,
    
    # Metadata extracted directly from Insights
    AdsInsights.Field.ad_name,
    AdsInsights.Field.adset_name,
    AdsInsights.Field.campaign_name,
    AdsInsights.Field.objective,
    # optimization_goal removed as requested

    # Meta - NOTE: objective NOT reliably available in insights, comes from metadata
    # AdsInsights.Field.objective,  # Commented out - use metadata instead
]

# ==============================================================================
# BREAKDOWNS - Only High-Value Ones
# ==============================================================================

BREAKDOWN_GROUPS = [
    {
        'type': 'demographic',
        'name': 'Age & Gender',
        'breakdowns': ['age', 'gender'],
        'fact_table': 'fact_age_gender_metrics',
        'enabled': True,
    },
    {
        'type': 'geographic',
        'name': 'Country',
        'breakdowns': ['country'],
        'fact_table': 'fact_country_metrics',
        'enabled': True,
    },
    {
        'type': 'placement',
        'name': 'Placement',
        'breakdowns': ['publisher_platform', 'platform_position'],
        'fact_table': 'fact_placement_metrics',
        'enabled': True,
    },
]

# Filter to only enabled
ACTIVE_BREAKDOWN_GROUPS = [g for g in BREAKDOWN_GROUPS if g['enabled']]

# ==============================================================================
# ACTION TYPES - Only Revenue-Driving
# ==============================================================================

ACTION_TYPES_TO_TRACK = [
    'purchase',
    'lead',
    'lead_website',
    'lead_form',
    'add_to_cart',
    'initiate_checkout',
    'complete_registration',
    'view_content',
    'appointment',
    'schedule',
    'contact',
    'submit_application',
    'start_trial'
]

# ==============================================================================
# ETL CONFIGURATION
# ==============================================================================

FIRST_PULL_DAYS = 450  # 3 years initially
DAILY_PULL_DAYS = 2  # Yesterday + today
CHUNK_DAYS = 90  # API call chunking

# ==============================================================================
# DATABASE CONSTANTS
# ==============================================================================

MISSING_DIM_VALUE = 'Unknown'
UNKNOWN_MEMBER_ID = 0

# Column renaming map
COLUMN_RENAME_MAP = {
    'Ad_Name': 'ad_name',
    'Date': 'date_start',
    'placement': 'placement_name', # General fallback
    'ad_creative_id': 'creative_id',
}

# ==============================================================================
# PRIMARY KEY DEFINITIONS
# ==============================================================================

FACT_TABLE_PKS = {
    'fact_core_metrics': [
        'date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id'
    ],
    'fact_placement_metrics': [
        'date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id', 'placement_id'
    ],
    'fact_age_gender_metrics': [
        'date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id', 'age_id', 'gender_id'
    ],
    'fact_country_metrics': [
        'date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id', 'country_id'
    ],
    'fact_action_metrics': [
        'date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id', 
        'action_type_id', 'attribution_window'
    ],
}

DIMENSION_PKS = {
    'dim_account': ['account_id'],
    'dim_campaign': ['campaign_id'],
    'dim_adset': ['adset_id'],
    'dim_ad': ['ad_id'],
    'dim_creative': ['creative_id'],
    'dim_date': ['date_id'],
    'dim_country': ['country'],
    'dim_age': ['age_group'],
    'dim_gender': ['gender'],
    'dim_placement': ['placement_name'],
    'dim_action_type': ['action_type'],
}

# ==============================================================================
# STATIC DIMENSION DATA
# ==============================================================================

STATIC_AGE_GROUPS = [
    '13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
]

STATIC_GENDER_GROUPS = [
    'male', 'female'
]

# ==============================================================================
# UNKNOWN MEMBER DEFAULTS
# ==============================================================================

UNKNOWN_MEMBER_DEFAULTS = {
    'dim_account': {
        'account_id': 0,
        'account_name': 'Unknown Account',
        'currency': 'USD',
    },
    'dim_campaign': {
        'campaign_id': 0,
        'account_id': 0,
        'campaign_name': 'Unknown Campaign',
        'objective': 'N/A',
        'campaign_status': 'UNKNOWN',
    },
    'dim_adset': {
        'adset_id': 0,
        'campaign_id': 0,
        'adset_name': 'Unknown AdSet',
        'adset_status': 'UNKNOWN',
        'targeting_type': 'N/A',
        'targeting_summary': 'N/A',
    },
    'dim_creative': {
        'creative_id': 0,
        'title': 'Unknown Creative',
        'body': 'N/A',
        'call_to_action_type': 'N/A',
        'image_url': None,
        'video_url': None,
        'video_length_seconds': None,
        'is_video': False,
    },
    'dim_ad': {
        'ad_id': 0,
        'adset_id': 0,
        'creative_id': 0,
        'ad_name': 'Unknown Ad',
        'ad_status': 'UNKNOWN',
    },
    'dim_date': {
        'date_id': 0,
        'date': '1970-01-01',
        'year': 1970,
        'month': 1,
        'day_of_week': 'Monday',
    },
    'dim_country': {
        'country': 'Unknown',
        'country_code': 'XX',
    },
    'dim_age': {
        'age_group': 'Unknown',
    },
    'dim_gender': {
        'gender': 'Unknown',
    },
    'dim_placement': {
        'placement_name': 'Unknown',
    },
    'dim_action_type': {
        'action_type': 'unknown',
        'is_conversion': False,
    },
}

# ==============================================================================
# AI & GEMINI CONFIGURATION
# ==============================================================================

GEMINI_MODEL = "gemini-2.0-flash"
