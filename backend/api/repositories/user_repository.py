from sqlalchemy.orm import Session
from typing import Optional, List
from backend.models.user_schema import User, UserAdAccount
from backend.models.schema import DimAccount
from datetime import datetime

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_fb_id(self, fb_id: str) -> Optional[User]:
        return self.db.query(User).filter(User.fb_user_id == fb_id).first()

    def get_user_by_google_id(self, google_id: str) -> Optional[User]:
        return self.db.query(User).filter(User.google_id == google_id).first()

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def create_user(self, email: str, fb_user_id: str, full_name: str, access_token: str, expires_at: datetime) -> User:
        user = User(
            email=email,
            fb_user_id=fb_user_id,
            full_name=full_name,
            fb_access_token=access_token,
            fb_token_expires_at=expires_at
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def create_user_with_password(self, email: str, password_hash: str, full_name: str) -> User:
        user = User(
            email=email,
            password_hash=password_hash,
            full_name=full_name
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_fb_token(self, user_id: int, access_token: str, expires_at: datetime):
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.fb_access_token = access_token
            user.fb_token_expires_at = expires_at
            self.db.commit()
        return user

    def update_password(self, user_id: int, password_hash: str):
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.password_hash = password_hash
            self.db.commit()
        return user

    def link_ad_account(self, user_id: int, account_id: int, name: str, currency: str, page_id: str = None, page_name: str = None):
        # 1. Ensure DimAccount exists
        account = self.db.query(DimAccount).filter(DimAccount.account_id == account_id).first()
        if not account:
            account = DimAccount(account_id=account_id, account_name=name, currency=currency)
            self.db.add(account)

        # 2. Check if link already exists
        link = self.db.query(UserAdAccount).filter(
            UserAdAccount.user_id == user_id,
            UserAdAccount.account_id == account_id
        ).first()

        if not link:
            link = UserAdAccount(user_id=user_id, account_id=account_id, page_id=page_id, page_name=page_name)
            self.db.add(link)
        else:
            # Update page info if link exists
            link.page_id = page_id
            link.page_name = page_name

        self.db.commit()
        return link

    def get_user_ad_accounts(self, user_id: int) -> List[DimAccount]:
        return self.db.query(DimAccount).join(UserAdAccount).filter(UserAdAccount.user_id == user_id).all()

    def get_user_account_ids(self, user_id: int) -> List[int]:
        """Get list of account IDs that user has access to (for filtering queries)"""
        result = self.db.query(UserAdAccount.account_id).filter(UserAdAccount.user_id == user_id).all()
        return [row[0] for row in result]

    def update_user_profile(
        self,
        user_id: int,
        full_name: Optional[str] = None,
        job_title: Optional[str] = None,
        years_experience: Optional[str] = None,
        referral_source: Optional[str] = None
    ) -> Optional[User]:
        """Update user profile fields from quiz"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        if full_name is not None:
            user.full_name = full_name
        if job_title is not None:
            user.job_title = job_title
        if years_experience is not None:
            user.years_experience = years_experience
        if referral_source is not None:
            user.referral_source = referral_source

        self.db.commit()
        self.db.refresh(user)
        return user


    # Magic Link & Onboarding Methods

    def create_user_with_email(self, email: str, full_name: Optional[str] = None) -> User:
        """Create a new user with just email (passwordless)"""
        user = User(
            email=email,
            full_name=full_name or email.split('@')[0],
            email_verified=False,
            onboarding_completed=False,
            onboarding_step='connect_facebook'
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def mark_email_verified(self, user_id: int) -> Optional[User]:
        """Mark user's email as verified after magic link confirmation"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.email_verified = True
            self.db.commit()
            self.db.refresh(user)
        return user

    def mark_onboarding_completed(self, user_id: int) -> Optional[User]:
        """Mark user's onboarding as complete"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.onboarding_completed = True
            user.onboarding_step = 'completed'
            self.db.commit()
            self.db.refresh(user)
        return user

    def update_onboarding_step(self, user_id: int, step: str) -> Optional[User]:
        """Update user's current onboarding step"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.onboarding_step = step
            self.db.commit()
            self.db.refresh(user)
        return user

    def get_onboarding_status(self, user_id: int) -> Optional[dict]:
        """Get user's onboarding progress"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        # Check if user has linked ad accounts
        accounts_count = self.db.query(UserAdAccount).filter(UserAdAccount.user_id == user_id).count()

        # Determine onboarding status
        facebook_connected = user.fb_user_id is not None
        accounts_selected = accounts_count > 0
        profile_completed = all([user.job_title, user.years_experience, user.referral_source])

        # Determine next step
        next_step = None
        if not facebook_connected:
            next_step = 'connect_facebook'
        elif not accounts_selected:
            next_step = 'select_accounts'
        elif not profile_completed:
            next_step = 'complete_profile'
        else:
            next_step = 'completed'

        return {
            'email_verified': user.email_verified,
            'facebook_connected': facebook_connected,
            'accounts_selected': accounts_selected,
            'profile_completed': profile_completed,
            'onboarding_completed': user.onboarding_completed,
            'current_step': user.onboarding_step,
            'next_step': next_step
        }
