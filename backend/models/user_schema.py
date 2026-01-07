from sqlalchemy import Column, Integer, String, ForeignKey, BigInteger, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .schema import Base, DimAccount

class User(Base):
    """
    Users table for the web application.
    Supports local email login and Facebook OAuth.
    """
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255))
    password_hash = Column(String(255), nullable=True) # Null if only FB login
    
    # Facebook OAuth Fields
    fb_user_id = Column(String(255), unique=True, index=True)
    fb_access_token = Column(String(2048)) # Long-lived token
    fb_token_expires_at = Column(DateTime)
    
    # Google OAuth Fields
    google_id = Column(String(255), unique=True, index=True)
    google_access_token = Column(String(2048))
    google_refresh_token = Column(String(2048))
    google_token_expires_at = Column(DateTime)

    # User Profile Fields (from quiz)
    job_title = Column(String(100), nullable=True)
    years_experience = Column(String(50), nullable=True)
    referral_source = Column(String(100), nullable=True)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    ad_accounts = relationship("UserAdAccount", back_populates="user", cascade="all, delete-orphan")


class UserAdAccount(Base):
    """
    Junction table linking Users to Ad Accounts.
    Enables multi-tenant access (User A can access Account X and Y, 
    while User B can also access Account X if shared).
    """
    __tablename__ = 'user_ad_account'
    
    user_id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    account_id = Column(BigInteger, ForeignKey('dim_account.account_id'), primary_key=True)
    permission_level = Column(String(50), default='admin') # e.g., admin, viewer
    
    # Relationships
    user = relationship("User", back_populates="ad_accounts")
    account = relationship("DimAccount")
