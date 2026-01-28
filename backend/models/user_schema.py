from sqlalchemy import Column, Integer, String, ForeignKey, BigInteger, DateTime, Boolean, Text
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
    secondary_email = Column(String(255), unique=True, nullable=True, index=True)
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
    platform_reason = Column(String(100), nullable=True)  # Why they came to platform
    company_type = Column(String(100), nullable=True)  # Business context
    role_with_ads = Column(String(100), nullable=True)  # Relationship with ad campaigns
    years_experience = Column(String(50), nullable=True)
    referral_source = Column(String(100), nullable=True)

    # Onboarding tracking
    email_verified = Column(Boolean, default=False)
    onboarding_completed = Column(Boolean, default=False)
    onboarding_step = Column(String(50))  # 'connect_facebook', 'select_accounts', 'complete_profile', 'completed'

    # User preferences
    timezone = Column(String(50), default='UTC')  # e.g., "America/New_York", "Europe/London"

    # Admin access
    is_admin = Column(Boolean, default=False)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    ad_accounts = relationship("UserAdAccount", back_populates="user", cascade="all, delete-orphan")

    @property
    def decrypted_fb_token(self) -> str:
        """Get decrypted Facebook access token (for use in code)."""
        from backend.utils.encryption_utils import TokenEncryption
        if not self.fb_access_token:
            return ""
        return TokenEncryption.decrypt_token(self.fb_access_token)

    @property
    def decrypted_google_token(self) -> str:
        """Get decrypted Google access token (for use in code)."""
        from backend.utils.encryption_utils import TokenEncryption
        if not self.google_access_token:
            return ""
        return TokenEncryption.decrypt_token(self.google_access_token)

    @property
    def decrypted_google_refresh_token(self) -> str:
        """Get decrypted Google refresh token (for use in code)."""
        from backend.utils.encryption_utils import TokenEncryption
        if not self.google_refresh_token:
            return ""
        return TokenEncryption.decrypt_token(self.google_refresh_token)


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
    page_id = Column(String(100), nullable=True)  # Default Facebook Page ID for this account
    page_name = Column(String(255), nullable=True)  # Facebook Page name for display

    # Relationships
    user = relationship("User", back_populates="ad_accounts")
    account = relationship("DimAccount")


class UserSubscription(Base):
    """
    Tracks user subscription status and Stripe integration.
    """
    __tablename__ = 'user_subscription'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)

    # Stripe identifiers
    stripe_customer_id = Column(String(255), index=True)
    stripe_subscription_id = Column(String(255))

    # Subscription state
    status = Column(String(50), nullable=False, default='free')  # free, trialing, active, cancelled, past_due
    plan_type = Column(String(50), default='free')  # free, starter, pro, enterprise

    # Trial tracking
    trial_start = Column(DateTime)
    trial_end = Column(DateTime)

    # Subscription dates
    current_period_start = Column(DateTime)
    current_period_end = Column(DateTime)
    cancelled_at = Column(DateTime)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    user = relationship("User", backref="subscription")


class SubscriptionHistory(Base):
    """
    Tracks subscription events (upgrades, downgrades, cancellations, etc.)
    """
    __tablename__ = 'subscription_history'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey('user_subscription.id'))

    event_type = Column(String(50), nullable=False)  # trial_start, activated, upgraded, downgraded, cancelled, renewed
    from_plan = Column(String(50))
    to_plan = Column(String(50))
    metadata_json = Column(Text)

    created_at = Column(DateTime, server_default=func.now(), index=True)


class PageView(Base):
    """
    Tracks user page views for analytics.
    """
    __tablename__ = 'page_view'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)

    page_path = Column(String(255), nullable=False, index=True)
    page_title = Column(String(255))
    referrer = Column(String(500))
    session_id = Column(String(100))
    user_agent = Column(Text)

    created_at = Column(DateTime, server_default=func.now(), index=True)
