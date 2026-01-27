"""
FastAPI dependencies for database sessions and shared utilities.

This module provides dependency injection functions for FastAPI endpoints,
primarily for database session management.
"""

import os
from typing import Generator, Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session


from backend.config.base_config import settings
from backend.utils.db_utils import get_db_engine

# Create database engine
engine = get_db_engine()

# Create SessionLocal class for creating database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status, Request, Cookie
from jose import JWTError, jwt
from backend.api.repositories.user_repository import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/facebook/login", auto_error=False)

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Validates JWT token and returns current user.
    Supports both Authorization header (Bearer token) and HttpOnly cookie.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Try token from header first, then fall back to cookie
    auth_token = token
    if auth_token is None:
        auth_token = request.cookies.get("auth_token")

    if auth_token is None:
        raise credentials_exception

    try:
        # Decode JWT token
        payload = jwt.decode(
            auth_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Fetch user from database
    from backend.models.user_schema import User
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return user


async def get_current_admin(current_user=Depends(get_current_user)):
    """
    Validates that the current user is an admin.
    Use this dependency for admin-only endpoints.
    """
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def get_current_user_optional(token: str = None, db: Session = Depends(get_db)):
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

    from backend.models.user_schema import User
    user = db.query(User).filter(User.id == int(user_id)).first()
    return user
