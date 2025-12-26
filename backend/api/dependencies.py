"""
FastAPI dependencies for database sessions and shared utilities.

This module provides dependency injection functions for FastAPI endpoints,
primarily for database session management.
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import sys
import os

# Add backend directory to path so we can import from utils
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.db_utils import get_db_engine

# Create database engine
engine = get_db_engine()

# Create SessionLocal class for creating database sessions
# autocommit=False: Don't auto-commit transactions
# autoflush=False: Don't auto-flush before queries
# bind=engine: Bind to our database engine
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session.

    This function creates a new database session for each request and
    ensures it's properly closed after the request completes.

    Yields:
        Session: SQLAlchemy session for database operations

    Example:
        ```python
        @router.get("/metrics")
        def get_metrics(db: Session = Depends(get_db)):
            # Use db session here
            result = db.execute(text("SELECT * FROM fact_core_metrics"))
            return result.fetchall()
        ```
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
