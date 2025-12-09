"""
DB_SCHEMA.PY

Purpose: Defines the entire Star Schema structure for the Data Warehouse 
using SQLAlchemy ORM. This file contains the Dimension and Fact table definitions 
and the function to create the schema in the PostgreSQL database.

Schema Architecture: 
- 7 Dimension Tables (Campaign, Ad, Placement, Country, Age, Gender, DATE)
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
# --- DIMENSIONS (7 Tables) ---
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
    # Campaign name is generally not guaranteed to be unique across campaigns, but must be NOT NULL
    campaign_name = Column(String, nullable=False)
    # Metadata
    status = Column(String)
    objective = Column(String)

class DimAd(Base):
    """Dimension table for Ad details."""
    __tablename__ = 'dim_ad'
    ad_id = Column(BigInteger, primary_key=True)
    # Ad name is generally not guaranteed to be unique across ads, but must be NOT NULL
    ad_name = Column(String, nullable=False)
    # Metadata
    creative_name = Column(String)

class DimPlacement(Base):
    """Dimension table for Ad Placement (e.g., Facebook, Instagram, Audience Network)."""
    __tablename__ = 'dim_placement'
    placement_id = Column(Integer, primary_key=True)
    # FIX: placement_name must be unique to serve as the Natural Key for UPSERT.
    placement_name = Column(String, nullable=False, unique=True)

class DimCountry(Base):
    """Dimension table for Country details."""
    __tablename__ = 'dim_country'
    country_id = Column(Integer, primary_key=True)
    # FIX: Renamed from country_code to country, and must be unique.
    country = Column(String, nullable=False, unique=True)

class DimAge(Base):
    """Dimension table for Age Group (e.g., '18-24', '45-54', 'N/A')."""
    __tablename__ = 'dim_age'
    age_id = Column(Integer, primary_key=True)
    # FIX: age_group must be unique to serve as the Natural Key.
    age_group = Column(String, nullable=False, unique=True)

class DimGender(Base):
    """Dimension table for Gender (e.g., 'male', 'female', 'unknown')."""
    __tablename__ = 'dim_gender'
    gender_id = Column(Integer, primary_key=True)
    # FIX: gender must be unique to serve as the Natural Key, solving the ON CONFLICT error.
    gender = Column(String, nullable=False, unique=True)


# -----------------------------------------------
# --- FACTS (4 Tables) ---
# -----------------------------------------------

class FactCoreMetrics(Base):
    """
    Fact table for core metrics aggregated by Date, Campaign, and Ad.
    This is the lowest common denominator of all data.
    """
    __tablename__ = 'fact_core_metrics'

    # Surrogate Primary Key (Internal for SQLAlchemy)
    id = Column(Integer, primary_key=True)

    # Foreign Keys (Natural Key) - Composite PK for UPSERT: date_id, campaign_id, ad_id
    date_id = Column(BigInteger, ForeignKey('dim_date.date_id'), nullable=False)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), nullable=False)
    ad_id = Column(BigInteger, ForeignKey('dim_ad.ad_id'), nullable=False)

    # Core Metrics
    spend = Column(Float)
    impressions = Column(BigInteger)
    clicks = Column(BigInteger)
    purchases = Column(Integer)

    # Enforce Composite PK in DB using UniqueConstraint for UPSERT logic
    # GRAIN: date_id + campaign_id + ad_id
    __table_args__ = (
        UniqueConstraint('date_id', 'campaign_id', 'ad_id', name='uc_core_metrics'),
    )


class FactPlacementMetrics(Base):
    """Fact table for metrics aggregated by Ad and Placement."""
    __tablename__ = 'fact_placement_metrics'

    # Surrogate Primary Key (Internal for SQLAlchemy)
    id = Column(Integer, primary_key=True)

    # Foreign Keys (Natural Key) - Composite PK for UPSERT: date_id, ad_id, placement_id
    date_id = Column(BigInteger, ForeignKey('dim_date.date_id'), nullable=False)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), nullable=False)
    ad_id = Column(BigInteger, ForeignKey('dim_ad.ad_id'), nullable=False)
    placement_id = Column(Integer, ForeignKey('dim_placement.placement_id'), nullable=False)

    # Metrics
    spend = Column(Float)
    impressions = Column(BigInteger)
    clicks = Column(BigInteger)
    purchases = Column(Integer)

    # Enforce Composite PK in DB using UniqueConstraint for UPSERT logic
    # GRAIN: date_id + campaign_id + ad_id + placement_id
    __table_args__ = (
        UniqueConstraint('date_id', 'campaign_id', 'ad_id', 'placement_id', name='uc_placement_metrics'),
    )

class FactAgeGenderMetrics(Base):
    """Fact table for metrics aggregated by Age and Gender."""
    __tablename__ = 'fact_age_gender_metrics'

    # Surrogate Primary Key (Internal for SQLAlchemy)
    id = Column(Integer, primary_key=True)

    # Foreign Keys (Natural Key) - Composite PK for UPSERT: date_id, ad_id, age_id, gender_id
    date_id = Column(BigInteger, ForeignKey('dim_date.date_id'), nullable=False)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), nullable=False)
    ad_id = Column(BigInteger, ForeignKey('dim_ad.ad_id'), nullable=False)
    age_id = Column(Integer, ForeignKey('dim_age.age_id'), nullable=False)
    gender_id = Column(Integer, ForeignKey('dim_gender.gender_id'), nullable=False)

    # Metrics
    spend = Column(Float)
    clicks = Column(BigInteger)
    purchases = Column(Integer)

    # Enforce Composite PK
    # GRAIN: date_id + campaign_id + ad_id + age_id + gender_id
    __table_args__ = (
        UniqueConstraint('date_id', 'campaign_id', 'ad_id', 'age_id', 'gender_id', name='uc_age_gender'),
    )

class FactCountryMetrics(Base):
    """Fact table for metrics aggregated by Country."""
    __tablename__ = 'fact_country_metrics'

    # Surrogate Primary Key (Internal for SQLAlchemy)
    id = Column(Integer, primary_key=True)

    # Foreign Keys (Natural Key) - Composite PK for UPSERT: date_id, ad_id, country_id
    date_id = Column(BigInteger, ForeignKey('dim_date.date_id'), nullable=False)
    campaign_id = Column(BigInteger, ForeignKey('dim_campaign.campaign_id'), nullable=False)
    ad_id = Column(BigInteger, ForeignKey('dim_ad.ad_id'), nullable=False)
    country_id = Column(Integer, ForeignKey('dim_country.country_id'), nullable=False)

    # Metrics
    spend = Column(Float)
    clicks = Column(BigInteger)
    purchases = Column(Integer)

    # Enforce Composite PK
    # GRAIN: date_id + campaign_id + ad_id + country_id
    __table_args__ = (
        UniqueConstraint('date_id', 'campaign_id', 'ad_id', 'country_id', name='uc_country'),
    )

# -----------------------------------------------
# --- Schema Creation Function ---
# -----------------------------------------------

def create_db_schema():
    """Creates all 11 tables defined in Base (7 Dim + 4 Fact) if they do not exist."""
    if engine:
        logger.info("⏳ Attempting to create all 11 Star Schema tables (if they don't exist)...")
        Base.metadata.create_all(engine)
        logger.info("✅ Database schema creation complete.")
    else:
        logger.critical("❌ Could not create schema: DB engine is not available.")