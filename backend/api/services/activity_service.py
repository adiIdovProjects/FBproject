"""
Activity Service - Handles page tracking and user activity aggregation.
"""

from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any

from backend.api.repositories.activity_repository import ActivityRepository
from backend.api.repositories.subscription_repository import SubscriptionRepository
from backend.api.services.audit_service import AuditService
from backend.models.user_schema import User, UserAdAccount
from backend.models.schema import DimAccount


class ActivityService:
    def __init__(self, db: Session):
        self.db = db
        self.activity_repo = ActivityRepository(db)
        self.subscription_repo = SubscriptionRepository(db)

    def track_page_view(
        self,
        user_id: int,
        page_path: str,
        page_title: str = None,
        referrer: str = None,
        session_id: str = None,
        user_agent: str = None
    ):
        """Track a page view"""
        self.activity_repo.log_page_view(
            user_id=user_id,
            page_path=page_path,
            page_title=page_title,
            referrer=referrer,
            session_id=session_id,
            user_agent=user_agent
        )

    def track_feature_usage(self, user_id: int, feature_name: str, metadata: dict = None):
        """Track feature usage via audit log"""
        AuditService.log_event(
            self.db,
            str(user_id),
            "FEATURE_USED",
            f"Used feature: {feature_name}",
            {"feature": feature_name, **(metadata or {})}
        )

    def search_users(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search users by email, name, or ID"""
        search_term = f"%{query}%"

        # Try to parse as ID first
        user_id = None
        try:
            user_id = int(query)
        except ValueError:
            pass

        filters = [
            User.email.ilike(search_term),
            User.full_name.ilike(search_term)
        ]

        if user_id:
            filters.append(User.id == user_id)

        users = self.db.query(User).filter(
            or_(*filters)
        ).limit(limit).all()

        results = []
        for user in users:
            subscription = self.subscription_repo.get_subscription_by_user(user.id)
            results.append({
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": str(user.created_at) if user.created_at else None,
                "subscription_status": subscription.status if subscription else "free",
                "plan_type": subscription.plan_type if subscription else "free",
                "onboarding_completed": user.onboarding_completed
            })

        return results

    def get_user_detail(self, user_id: int) -> Dict[str, Any]:
        """Get comprehensive user detail for admin view"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        # Get subscription
        subscription = self.subscription_repo.get_subscription_by_user(user_id)

        # Get linked accounts
        linked_accounts = self.db.query(
            UserAdAccount, DimAccount
        ).join(
            DimAccount, UserAdAccount.account_id == DimAccount.account_id
        ).filter(
            UserAdAccount.user_id == user_id
        ).all()

        accounts_list = [
            {
                "account_id": str(ua.account_id),
                "account_name": acc.account_name if acc else "Unknown",
                "permission_level": ua.permission_level
            }
            for ua, acc in linked_accounts
        ]

        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "created_at": str(user.created_at) if user.created_at else None,
            "updated_at": str(user.updated_at) if user.updated_at else None,
            # Profile
            "job_title": user.job_title,
            "years_experience": user.years_experience,
            "referral_source": user.referral_source,
            # Auth
            "email_verified": user.email_verified,
            "fb_connected": user.fb_user_id is not None,
            "google_connected": user.google_id is not None,
            "is_admin": user.is_admin,
            # Onboarding
            "onboarding_completed": user.onboarding_completed,
            "onboarding_step": user.onboarding_step,
            # Subscription
            "subscription": {
                "status": subscription.status if subscription else "free",
                "plan_type": subscription.plan_type if subscription else "free",
                "trial_start": str(subscription.trial_start) if subscription and subscription.trial_start else None,
                "trial_end": str(subscription.trial_end) if subscription and subscription.trial_end else None,
                "current_period_end": str(subscription.current_period_end) if subscription and subscription.current_period_end else None,
                "cancelled_at": str(subscription.cancelled_at) if subscription and subscription.cancelled_at else None
            },
            # Linked accounts
            "linked_accounts": accounts_list,
            "account_count": len(accounts_list)
        }

    def get_user_activity_timeline(self, user_id: int, limit: int = 100) -> List[Dict[str, Any]]:
        """Get activity timeline for a user"""
        return self.activity_repo.get_user_activity_timeline(user_id, limit)

    def get_user_page_views(self, user_id: int, limit: int = 100) -> List[Dict[str, Any]]:
        """Get page views for a user"""
        return self.activity_repo.get_user_page_views(user_id, limit)

    def get_user_subscription_history(self, user_id: int) -> List[Dict[str, Any]]:
        """Get subscription history for a user"""
        return self.subscription_repo.get_subscription_history(user_id)

    def get_all_users(self, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Get paginated list of all users"""
        total = self.db.query(User).count()

        users = self.db.query(User).order_by(
            User.created_at.desc()
        ).offset(offset).limit(limit).all()

        results = []
        for user in users:
            subscription = self.subscription_repo.get_subscription_by_user(user.id)
            results.append({
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": str(user.created_at) if user.created_at else None,
                "subscription_status": subscription.status if subscription else "free",
                "plan_type": subscription.plan_type if subscription else "free",
                "onboarding_completed": user.onboarding_completed
            })

        return {
            "users": results,
            "total": total,
            "limit": limit,
            "offset": offset
        }
