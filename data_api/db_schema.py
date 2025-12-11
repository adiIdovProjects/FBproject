"""
DB_SCHEMA.PY

Purpose: Defines the entire Star Schema structure for the Data Warehouse 
using SQLAlchemy ORM. This file contains the Dimension and Fact table definitions 
and the function to create the schema in the PostgreSQL database.

Schema Architecture: 
- 9 Dimension Tables (Campaign, Ad, AdSet, Creative, Placement, Country, Age, Gender, DATE)
- 4 Fact Tables (Core, Placement, AgeGender, Country)

Functions:
- create_db_schema: Executes Base.metadata.create_all(engine) to build all tables.
"""

from sqlalchemy import (
    Column, Integer, String, Float, Date, BigInteger, 
    ForeignKey,
    UniqueConstraint 
)
from sqlalchemy.orm import declarative_base
# Assuming db_connector is at the same level or its import path is correct
from data_api.database import ENGINE as engine 
import logging

logger = logging.getLogger(__name__)

# Base for all table definitions
Base = declarative_base()

# -----------------------------------------------
# --- DIMENSIONS (9 Tables) ---
# -----------------------------------------------

class DimDate(Base):
    """Dimension table for Date attributes."""
    __tablename__ = 'dim_date'
    # date_id is the BigInteger Surrogate Key (YYYYMMDD)
    date_id = Column(BigInteger, primary_key=True) 
    # date is the full date object
    date = Column(Date, nullable=False, unique=True) # Date itself should be unique
    # Additional date attributes
    year = Column(Integer)
    month = Column(Integer)
    day_of_week = Column(String) 

class DimCampaign(Base):
    """Dimension table for Campaign details."""
    __tablename__ = 'dim_campaign'
    campaign_id = Column(BigInteger, primary_key=True)
    # Campaign name must be NOT NULL
    campaign_name = Column(String, nullable=False)
    # Metadata
    status = Column(String)
    objective = Column(String)

class DimAd(Base):
    """Dimension table for Ad details."""
    __tablename__ = 'dim_ad'
    ad_id = Column(BigInteger, primary_key=True)
    # Ad name must be NOT NULL
    ad_name = Column(String, nullable=False)
    # Metadata
    creative_name = Column(String)

class DimAdset(Base):
    """Dimension table for Ad Set details."""
    __tablename__ = 'dim_adset'
    # adset_id is the natural and primary key
    adset_id = Column(BigInteger, primary_key=True) 
    adset_name = Column(String(255), nullable=False)

class DimCreative(Base):
    """Dimension table for Ad Creative attributes."""
    __tablename__ = 'dim_creative'
    # creative_id is the Surrogate Key, derived from Meta API Ad Creative ID
    creative_id = Column(BigInteger, primary_key=True) 
    creative_name = Column(String(255), nullable=True)             # Creative name
    title = Column(String(512))                            # Ad headline/title
    body = Column(String)                                  # Ad body text
    call_to_action_type = Column(String(100))              # CTA button type (e.g., 'SHOP_NOW')
    # Stores the complex object_story_spec as a JSON string
    object_story_spec = Column(String)                     

class DimPlacement(Base):
    """Dimension table for Ad Placement (e.g., Facebook, Instagram, Audience Network)."""
    __tablename__ = 'dim_placement'
    placement_id = Column(Integer, primary_key=True)
    # placement_name must be unique to serve as the Natural Key for UPSERT.
    placement_name = Column(String, nullable=False, unique=True)

class DimCountry(Base):
    """Dimension table for Country details."""
    __tablename__ = 'dim_country'
    country_id = Column(Integer, primary_key=True)
    # country code/name must be unique.
    country = Column(String, nullable=False, unique=True)

class DimAge(Base):
    """Dimension table for Age Group (e.g., '18-24', '45-54', 'N/A')."""
    __tablename__ = 'dim_age'
    age_id = Column(Integer, primary_key=True)
    # age_group must be unique to serve as the Natural Key.
    age_group = Column(String, nullable=False, unique=True)

class DimGender(Base):
    """Dimension table for Gender (e.g., 'male', 'female', 'unknown')."""
    __tablename__ = 'dim_gender'
    gender_id = Column(Integer, primary_key=True)
    # gender must be unique to serve as the Natural Key.
    gender = Column(String, nullable=False, unique=True)


# -----------------------------------------------
# --- FACTS (4 Tables) ---
# -----------------------------------------------

class FactCoreMetrics(Base):
    """
    Fact table for core metrics aggregated by Date, Campaign, Adset, Ad, and Creative.
    GRAIN: date_id, campaign_id, adset_id, ad_id, creative_id
    """
    __tablename__ = 'fact_core_metrics'

    # Composite Primary Key (Natural Key/Grain)
    # NOTE: All columns defining the grain must be set to primary_key=True to be used in the UPSERT's ON CONFLICT clause.
    date_id = Column(BigInteger, ForeignKey('dim_date.date_id'), primary_key=True, nullable=False)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), primary_key=True, nullable=False)
    adset_id = Column(BigInteger, ForeignKey('dim_adset.adset_id'), primary_key=True, nullable=False)
    ad_id = Column(BigInteger, ForeignKey('dim_ad.ad_id'), primary_key=True, nullable=False)
    # Foreign Key to DimCreative (included in PK to define the grain)
    creative_id = Column(BigInteger, ForeignKey('dim_creative.creative_id'), primary_key=True, nullable=False)

    # Core Metrics
    spend = Column(Float)
    impressions = Column(BigInteger)
    clicks = Column(BigInteger)
    purchases = Column(Integer)
    
    # Video View Metrics
    video_p100_watched_actions = Column(BigInteger) # Video 100% watched
    video_p75_watched_actions = Column(BigInteger)  # Video 75% watched
    video_p50_watched_actions = Column(BigInteger)  # Video 50% watched
    video_p25_watched_actions = Column(BigInteger)  # Video 25% watched
    video_30_sec_watched_actions = Column(BigInteger) # Video 30 second views
    video_avg_time_watched_actions = Column(Float) # Average time watched (seconds)

    # FIX for Error 1: Explicitly defining the Unique Constraint on the 5-column grain.
    # This ensures Postgres recognizes the required key for the UPSERT ON CONFLICT clause.
    __table_args__ = (
        UniqueConstraint('date_id', 'campaign_id', 'adset_id', 'ad_id', 'creative_id', name='fact_core_metrics_unique_composite_key'),
    )


class FactPlacementMetrics(Base):
    """Fact table for metrics aggregated by Ad, Adset, and Placement."""
    __tablename__ = 'fact_placement_metrics'

    # Composite Primary Key (Natural Key/Grain: date_id, campaign_id, adset_id, ad_id, placement_id)
    # NOTE: All columns defining the grain must be set to primary_key=True.
    date_id = Column(BigInteger, ForeignKey('dim_date.date_id'), primary_key=True, nullable=False)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), primary_key=True, nullable=False)
    adset_id = Column(BigInteger, ForeignKey('dim_adset.adset_id'), primary_key=True, nullable=False) 
    ad_id = Column(BigInteger, ForeignKey('dim_ad.ad_id'), primary_key=True, nullable=False)
    placement_id = Column(Integer, ForeignKey('dim_placement.placement_id'), primary_key=True, nullable=False)

    # Metrics
    spend = Column(Float)
    impressions = Column(BigInteger)
    clicks = Column(BigInteger)
    purchases = Column(Integer)


class FactAgeGenderMetrics(Base):
    """Fact table for metrics aggregated by Ad, Adset, Age, and Gender."""
    __tablename__ = 'fact_age_gender_metrics'

    # Composite Primary Key (Natural Key/Grain: date_id, campaign_id, adset_id, ad_id, age_id, gender_id)
    # NOTE: All columns defining the grain must be set to primary_key=True.
    date_id = Column(BigInteger, ForeignKey('dim_date.date_id'), primary_key=True, nullable=False)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), primary_key=True, nullable=False)
    adset_id = Column(BigInteger, ForeignKey('dim_adset.adset_id'), primary_key=True, nullable=False) 
    ad_id = Column(BigInteger, ForeignKey('dim_ad.ad_id'), primary_key=True, nullable=False)
    age_id = Column(Integer, ForeignKey('dim_age.age_id'), primary_key=True, nullable=False)
    gender_id = Column(Integer, ForeignKey('dim_gender.gender_id'), primary_key=True, nullable=False)

    # Metrics
    spend = Column(Float)
    clicks = Column(BigInteger)
    purchases = Column(Integer)
    

class FactCountryMetrics(Base):
    """Fact table for metrics aggregated by Ad, Adset, and Country."""
    __tablename__ = 'fact_country_metrics'

    # Composite Primary Key (Natural Key/Grain: date_id, campaign_id, adset_id, ad_id, country_id)
    # NOTE: All columns defining the grain must be set to primary_key=True.
    date_id = Column(BigInteger, ForeignKey('dim_date.date_id'), primary_key=True, nullable=False)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), primary_key=True, nullable=False)
    adset_id = Column(BigInteger, ForeignKey('dim_adset.adset_id'), primary_key=True, nullable=False) 
    ad_id = Column(BigInteger, ForeignKey('dim_ad.ad_id'), primary_key=True, nullable=False)
    country_id = Column(Integer, ForeignKey('dim_country.country_id'), primary_key=True, nullable=False)

    # Metrics
    spend = Column(Float)
    clicks = Column(BigInteger)
    purchases = Column(Integer)


# -----------------------------------------------
# --- Schema Creation Function ---
# -----------------------------------------------

def create_db_schema():
    """Creates all 13 tables defined in Base (9 Dim + 4 Fact) if they do not exist."""
    if engine:
        logger.info("⏳ Attempting to create all 13 Star Schema tables (if they don't exist)...")
        Base.metadata.create_all(engine)
        logger.info("✅ Database schema creation complete.")
    else:
        logger.critical("❌ Could not create schema: DB engine is not available.")