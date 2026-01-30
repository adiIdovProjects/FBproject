"""
models/schema.py - Complete Database Schema (Lean & Efficient)
"""

from sqlalchemy import (
    Column, Integer, String, Float, Date, BigInteger, Boolean, Text,
    ForeignKey, UniqueConstraint, Index, DateTime
)
from sqlalchemy.orm import declarative_base
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
Base = declarative_base()

# ==============================================================================
# DIMENSION TABLES
# ==============================================================================

class DimAccount(Base):
    __tablename__ = 'dim_account'
    
    account_id = Column(BigInteger, primary_key=True)
    account_name = Column(String(255), nullable=False)
    currency = Column(String(3), nullable=False, default='USD')


class DimDate(Base):
    __tablename__ = 'dim_date'
    
    date_id = Column(BigInteger, primary_key=True)
    date = Column(Date, nullable=False, unique=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    day_of_week = Column(String(10), nullable=False)
    
    __table_args__ = (
        Index('idx_dim_date_year_month', 'year', 'month'),
    )


class DimCampaign(Base):
    __tablename__ = 'dim_campaign'
    
    campaign_id = Column(BigInteger, primary_key=True)
    account_id = Column(BigInteger, ForeignKey('dim_account.account_id'), nullable=False)
    campaign_name = Column(String(255), nullable=False)
    objective = Column(String(50))
    campaign_status = Column(String(20))
    
    __table_args__ = (
        Index('idx_dim_campaign_account', 'account_id'),
        Index('idx_dim_campaign_status', 'campaign_status'),
    )


class DimAdset(Base):
    __tablename__ = 'dim_adset'
    
    adset_id = Column(BigInteger, primary_key=True)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), nullable=False)
    adset_name = Column(String(255), nullable=False)
    adset_status = Column(String(20))
    targeting_type = Column(String(50))
    targeting_summary = Column(Text)
    
    __table_args__ = (
        Index('idx_dim_adset_campaign', 'campaign_id'),
        Index('idx_dim_adset_status', 'adset_status'),
    )


class DimAd(Base):
    __tablename__ = 'dim_ad'
    
    ad_id = Column(BigInteger, primary_key=True)
    adset_id = Column(BigInteger, ForeignKey('dim_adset.adset_id'), nullable=False)
    creative_id = Column(BigInteger, ForeignKey('dim_creative.creative_id'))
    ad_name = Column(String(255), nullable=False)
    ad_status = Column(String(20))
    
    __table_args__ = (
        Index('idx_dim_ad_adset', 'adset_id'),
        Index('idx_dim_ad_creative', 'creative_id'),
        Index('idx_dim_ad_status', 'ad_status'),
    )


class DimCreative(Base):
    __tablename__ = 'dim_creative'
    
    creative_id = Column(BigInteger, primary_key=True)
    title = Column(String(255))
    body = Column(String(500))
    call_to_action_type = Column(String(50))
    image_url = Column(String(2048))
    video_url = Column(String(2048))
    video_length_seconds = Column(Integer)
    is_video = Column(Boolean, default=False)
    is_carousel = Column(Boolean, default=False)


class DimPlacement(Base):
    __tablename__ = 'dim_placement'
    
    placement_id = Column(Integer, primary_key=True, autoincrement=True)
    placement_name = Column(String(50), nullable=False, unique=True)


class DimCountry(Base):
    __tablename__ = 'dim_country'
    
    country_id = Column(Integer, primary_key=True, autoincrement=True)
    country = Column(String(100), nullable=False, unique=True)
    country_code = Column(String(2))


class DimAge(Base):
    __tablename__ = 'dim_age'
    
    age_id = Column(Integer, primary_key=True, autoincrement=True)
    age_group = Column(String(20), nullable=False, unique=True)


class DimGender(Base):
    __tablename__ = 'dim_gender'
    
    gender_id = Column(Integer, primary_key=True, autoincrement=True)
    gender = Column(String(20), nullable=False, unique=True)


class DimActionType(Base):
    __tablename__ = 'dim_action_type'

    action_type_id = Column(Integer, primary_key=True, autoincrement=True)
    action_type = Column(String(100), nullable=False, unique=True)
    is_conversion = Column(Boolean, default=False)

    __table_args__ = (
        Index('idx_dim_action_type_conversion', 'is_conversion'),
    )


class DimInsightHistory(Base):
    """
    Stores auto-generated AI insights for proactive analysis.
    Used by the Big Brain AI Agent to track daily/weekly insights automatically.
    """
    __tablename__ = 'dim_insight_history'

    insight_id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(BigInteger, ForeignKey('dim_account.account_id'), nullable=True)
    generated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    insight_type = Column(String(50), nullable=False)  # 'daily', 'weekly', 'alert'
    priority = Column(String(20), nullable=False)  # 'critical', 'warning', 'opportunity', 'info'
    category = Column(String(50), nullable=False)  # 'performance', 'creative', 'targeting', 'budget'
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)  # Markdown formatted insight
    data_json = Column(Text)  # JSON string with supporting data
    is_read = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        Index('idx_insight_account_generated', 'account_id', 'generated_at'),
        Index('idx_insight_priority', 'priority'),
        Index('idx_insight_type', 'insight_type'),
        Index('idx_insight_read', 'is_read'),
    )


# ==============================================================================
# FACT TABLES
# ==============================================================================

class FactCoreMetrics(Base):
    __tablename__ = 'fact_core_metrics'
    
    # Composite PK
    date_id = Column(BigInteger, ForeignKey('dim_date.date_id'), primary_key=True, nullable=False)
    account_id = Column(BigInteger, ForeignKey('dim_account.account_id'), primary_key=True, nullable=False)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), primary_key=True, nullable=False)
    adset_id = Column(BigInteger, ForeignKey('dim_adset.adset_id'), primary_key=True, nullable=False)
    ad_id = Column(BigInteger, ForeignKey('dim_ad.ad_id'), primary_key=True, nullable=False)
    creative_id = Column(BigInteger, ForeignKey('dim_creative.creative_id'), primary_key=True, nullable=False)
    
    # Core metrics (raw)
    spend = Column(Float, nullable=False, default=0.0)
    impressions = Column(BigInteger, nullable=False, default=0)
    clicks = Column(BigInteger, nullable=False, default=0)
    
    # Top conversions (7d_click attribution) - for query speed
    purchases = Column(BigInteger, nullable=False, default=0)
    purchase_value = Column(Float, nullable=False, default=0.0)
    leads = Column(BigInteger, nullable=False, default=0)
    add_to_cart = Column(BigInteger, nullable=False, default=0)
    lead_website = Column(BigInteger, nullable=False, default=0)  
    lead_form = Column(BigInteger, nullable=False, default=0)    
    
    # Video metrics (optional)
    video_plays = Column(BigInteger, default=0)
    video_p25_watched = Column(BigInteger, default=0)
    video_p50_watched = Column(BigInteger, default=0)
    video_p75_watched = Column(BigInteger, default=0)
    video_p100_watched = Column(BigInteger, default=0)
    video_avg_time_watched = Column(Float, default=0.0)
    
    __table_args__ = (
        UniqueConstraint('date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id',
                        name='uq_fact_core'),
        Index('idx_fact_core_date', 'date_id'),
        Index('idx_fact_core_account', 'account_id'),
        Index('idx_fact_core_account_date', 'account_id', 'date_id'),
        Index('idx_fact_core_campaign', 'campaign_id'),
        Index('idx_fact_core_adset', 'adset_id'),
        Index('idx_fact_core_ad', 'ad_id'),
        Index('idx_fact_core_creative', 'creative_id'),
        # Composite indexes for common query patterns (performance optimization)
        Index('idx_fact_core_date_account_campaign', 'date_id', 'account_id', 'campaign_id'),
        Index('idx_fact_core_date_account_adset', 'date_id', 'account_id', 'adset_id'),
        Index('idx_fact_core_date_account_ad', 'date_id', 'account_id', 'ad_id'),
    )


class FactPlacementMetrics(Base):
    __tablename__ = 'fact_placement_metrics'
    
    date_id = Column(BigInteger, ForeignKey('dim_date.date_id'), primary_key=True, nullable=False)
    account_id = Column(BigInteger, ForeignKey('dim_account.account_id'), primary_key=True, nullable=False)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), primary_key=True, nullable=False)
    adset_id = Column(BigInteger, ForeignKey('dim_adset.adset_id'), primary_key=True, nullable=False)
    ad_id = Column(BigInteger, ForeignKey('dim_ad.ad_id'), primary_key=True, nullable=False)
    creative_id = Column(BigInteger, ForeignKey('dim_creative.creative_id'), primary_key=True, nullable=False)
    placement_id = Column(Integer, ForeignKey('dim_placement.placement_id'), primary_key=True, nullable=False)
    
    spend = Column(Float, nullable=False, default=0.0)
    impressions = Column(BigInteger, nullable=False, default=0)
    clicks = Column(BigInteger, nullable=False, default=0)
    
    __table_args__ = (
        UniqueConstraint('date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id', 'placement_id',
                        name='uq_fact_placement'),
        Index('idx_fact_placement_date', 'date_id'),
        Index('idx_fact_placement_account', 'account_id'),
        Index('idx_fact_placement_campaign', 'campaign_id'),
        # Composite indexes for common query patterns
        Index('idx_fact_placement_date_account_placement', 'date_id', 'account_id', 'placement_id'),
    )


class FactAgeGenderMetrics(Base):
    __tablename__ = 'fact_age_gender_metrics'
    
    date_id = Column(BigInteger, ForeignKey('dim_date.date_id'), primary_key=True, nullable=False)
    account_id = Column(BigInteger, ForeignKey('dim_account.account_id'), primary_key=True, nullable=False)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), primary_key=True, nullable=False)
    adset_id = Column(BigInteger, ForeignKey('dim_adset.adset_id'), primary_key=True, nullable=False)
    ad_id = Column(BigInteger, ForeignKey('dim_ad.ad_id'), primary_key=True, nullable=False)
    creative_id = Column(BigInteger, ForeignKey('dim_creative.creative_id'), primary_key=True, nullable=False)
    age_id = Column(Integer, ForeignKey('dim_age.age_id'), primary_key=True, nullable=False)
    gender_id = Column(Integer, ForeignKey('dim_gender.gender_id'), primary_key=True, nullable=False)
    
    spend = Column(Float, nullable=False, default=0.0)
    impressions = Column(BigInteger, nullable=False, default=0)
    clicks = Column(BigInteger, nullable=False, default=0)
    
    __table_args__ = (
        UniqueConstraint('date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id',
                        'age_id', 'gender_id', name='uq_fact_age_gender'),
        Index('idx_fact_age_gender_date', 'date_id'),
        Index('idx_fact_age_gender_account', 'account_id'),
        Index('idx_fact_age_gender_campaign', 'campaign_id'),
        # Composite indexes for common query patterns
        Index('idx_fact_age_gender_date_account_age', 'date_id', 'account_id', 'age_id'),
        Index('idx_fact_age_gender_date_account_gender', 'date_id', 'account_id', 'gender_id'),
    )


class FactCountryMetrics(Base):
    __tablename__ = 'fact_country_metrics'
    
    date_id = Column(BigInteger, ForeignKey('dim_date.date_id'), primary_key=True, nullable=False)
    account_id = Column(BigInteger, ForeignKey('dim_account.account_id'), primary_key=True, nullable=False)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), primary_key=True, nullable=False)
    adset_id = Column(BigInteger, ForeignKey('dim_adset.adset_id'), primary_key=True, nullable=False)
    ad_id = Column(BigInteger, ForeignKey('dim_ad.ad_id'), primary_key=True, nullable=False)
    creative_id = Column(BigInteger, ForeignKey('dim_creative.creative_id'), primary_key=True, nullable=False)
    country_id = Column(Integer, ForeignKey('dim_country.country_id'), primary_key=True, nullable=False)
    
    spend = Column(Float, nullable=False, default=0.0)
    impressions = Column(BigInteger, nullable=False, default=0)
    clicks = Column(BigInteger, nullable=False, default=0)
    
    __table_args__ = (
        UniqueConstraint('date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id', 'country_id',
                        name='uq_fact_country'),
        Index('idx_fact_country_date', 'date_id'),
        Index('idx_fact_country_account', 'account_id'),
        Index('idx_fact_country_campaign', 'campaign_id'),
        # Composite indexes for common query patterns
        Index('idx_fact_country_date_account_country', 'date_id', 'account_id', 'country_id'),
    )


class FactActionMetrics(Base):
    """CRITICAL: Granular action/conversion tracking"""
    __tablename__ = 'fact_action_metrics'
    
    date_id = Column(BigInteger, ForeignKey('dim_date.date_id'), primary_key=True, nullable=False)
    account_id = Column(BigInteger, ForeignKey('dim_account.account_id'), primary_key=True, nullable=False)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), primary_key=True, nullable=False)
    adset_id = Column(BigInteger, ForeignKey('dim_adset.adset_id'), primary_key=True, nullable=False)
    ad_id = Column(BigInteger, ForeignKey('dim_ad.ad_id'), primary_key=True, nullable=False)
    creative_id = Column(BigInteger, ForeignKey('dim_creative.creative_id'), primary_key=True, nullable=False)
    action_type_id = Column(Integer, ForeignKey('dim_action_type.action_type_id'), primary_key=True, nullable=False)
    attribution_window = Column(String(20), primary_key=True, nullable=False)
    
    action_count = Column(BigInteger, nullable=False, default=0)
    action_value = Column(Float, nullable=False, default=0.0)
    
    __table_args__ = (
        UniqueConstraint('date_id', 'account_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id',
                        'action_type_id', 'attribution_window', name='uq_fact_action'),
        Index('idx_fact_action_type', 'action_type_id'),
        Index('idx_fact_action_date', 'date_id'),
        Index('idx_fact_action_account', 'account_id'),
        # Composite indexes for common query patterns
        Index('idx_fact_action_date_account_action', 'date_id', 'account_id', 'action_type_id'),
    )

class AuditLog(Base):
    """Permanent record of critical system actions"""
    __tablename__ = 'audit_log'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(100), nullable=False)
    event_type = Column(String(50), nullable=False)
    description = Column(Text)
    metadata_json = Column(Text) # JSON string of additional context
    ip_address = Column(String(45))
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index('idx_audit_user', 'user_id'),
        Index('idx_audit_event', 'event_type'),
    )


# ==============================================================================
# BUSINESS PROFILES
# ==============================================================================

class BusinessProfile(Base):
    """Per-account business profile for AI-powered recommendations"""
    __tablename__ = 'business_profiles'

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(BigInteger, ForeignKey('dim_account.account_id', ondelete='CASCADE'), nullable=False, unique=True)

    # User input
    website_url = Column(Text)
    business_description = Column(Text)  # fallback if no URL

    # AI-extracted structured profile
    business_type = Column(String(100))       # ecommerce, lead_gen, saas, local_business, etc.
    business_model = Column(String(50))       # b2b, b2c, b2b2c
    target_audience = Column(Text)            # ICP description
    tone_of_voice = Column(String(100))       # professional, casual, playful, etc.
    products_services = Column(Text)          # JSON array
    geographic_focus = Column(Text)           # JSON array of countries/regions
    industry = Column(String(100))
    value_propositions = Column(Text)         # JSON array
    visual_style_notes = Column(Text)         # colors, imagery style

    # Social media analysis
    content_themes = Column(Text)             # JSON - themes from page posts
    posting_style = Column(Text)              # description of posting patterns
    engagement_patterns = Column(Text)        # JSON - what gets engagement

    # Meta
    analysis_status = Column(String(50), default='pending')  # pending, analyzing, completed, failed
    website_analyzed_at = Column(DateTime)
    social_analyzed_at = Column(DateTime)
    profile_json = Column(Text)               # full raw Gemini response as JSON backup

    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index('idx_business_profile_account_id', 'account_id'),
    )


def create_schema(engine):
    """Create all tables"""
    Base.metadata.create_all(engine)
    logger.info("Database schema created successfully")