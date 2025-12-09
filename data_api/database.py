"""
DATABASE.PY
 
Purpose: Manages the configuration and initialization of the SQLAlchemy 
database engine by reading environment variables. This file serves as 
the centralized source for establishing the DB connection.

Functions:
- get_db_engine: Creates and returns the SQLAlchemy engine instance with 
                 robust connection pooling settings.
"""

from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv() 

# Retrieve DB variables
DB_USER = os.getenv("POSTGRES_USER")
DB_PASS = os.getenv("DB_PASSWORD") 
DB_HOST = os.getenv("POSTGRES_HOST")
DB_PORT = os.getenv("POSTGRES_PORT")
DB_NAME = os.getenv("POSTGRES_DB")

# Critical check
if not all([DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME]):
    raise EnvironmentError("❌ FATAL: One of the DB environment variables is missing or empty. Please check the .env file.")

# PostgreSQL connection string
DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create the SQLAlchemy engine
def get_db_engine():
    """
    Creates and returns the SQLAlchemy engine for DB connection.
    Includes pool management settings to prevent idle timeouts (f405 errors).
    """
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_recycle=3600,  
            pool_pre_ping=True 
        )
        logger.info("✅ SQLAlchemy Engine created and configured for API with robust pooling.")
        return engine
    except Exception as e:
        logger.error(f"❌ Error creating DB engine: {e}")
        return None

# Global Engine Instance
ENGINE = get_db_engine()