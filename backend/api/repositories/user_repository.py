from sqlalchemy.orm import Session
from typing import Optional, List
from models.user_schema import User, UserAdAccount
from models.schema import DimAccount
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

    def update_fb_token(self, user_id: int, access_token: str, expires_at: datetime):
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.fb_access_token = access_token
            user.fb_token_expires_at = expires_at
            self.db.commit()
        return user

    def link_ad_account(self, user_id: int, account_id: int, name: str, currency: str):
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
            link = UserAdAccount(user_id=user_id, account_id=account_id)
            self.db.add(link)
        
        self.db.commit()
        return link

    def get_user_ad_accounts(self, user_id: int) -> List[DimAccount]:
        return self.db.query(DimAccount).join(UserAdAccount).filter(UserAdAccount.user_id == user_id).all()
