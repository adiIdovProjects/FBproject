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

from config.base_config import settings
from utils.db_utils import get_db_engine

# Create database engine
engine = get_db_engine()

# Create SessionLocal class for creating database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from api.repositories.user_repository import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/facebook/login", auto_error=False)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(lambda: SessionLocal())
):
    """
    Validates JWT token and returns current user.
    Supports dev bypass via DEV_BYPASS_AUTH environment variable.
    """
    # Development bypass (ONLY if explicitly enabled)
    dev_bypass = os.getenv("DEV_BYPASS_AUTH", "false").lower() == "true"
    if dev_bypass:
        # Use ASCII-only warning message to avoid Unicode encoding issues
        pass  # Dev bypass enabled
        from models.user_schema import User
        user = db.query(User).first()
        if user:
            return user
        # Create dev user if none exists
        class MockUser:
            id = 1
            email = "dev@example.com"
            is_active = True
            fb_user_id = None
            fb_access_token = None
            google_id = None
            full_name = "Dev User"
            created_at = None
        return MockUser()

    # Production authentication flow
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if token is None:
        raise credentials_exception

    try:
        # Decode JWT token
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError as e:
        print(f"JWT validation error: {e}")
        raise credentials_exception

    # Fetch user from database
    from models.user_schema import User
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return user


async def get_current_user_optional(token: str = None, db: Session = Depends(lambda: SessionLocal())):
    """
    Optional authentication - returns None if no token provided.
    Temporary function for testing without authentication.
    """
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    from models.user_schema import User
    user = db.query(User).filter(User.id == int(user_id)).first()
    return user


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
