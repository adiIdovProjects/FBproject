"""
Subscription Repository - Data access for subscription tracking.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Dict, Any
from datetime import datetime
import json

from backend.models.user_schema import UserSubscription, SubscriptionHistory


class SubscriptionRepository:
    def __init__(self, db: Session):
        self.db = db

    # ==================== Subscription CRUD ====================

    def get_subscription_by_user(self, user_id: int) -> Optional[UserSubscription]:
        """Get subscription for a user"""
        return self.db.query(UserSubscription).filter(
            UserSubscription.user_id == user_id
        ).first()

    def get_subscription_by_stripe_customer(self, customer_id: str) -> Optional[UserSubscription]:
        """Get subscription by Stripe customer ID"""
        return self.db.query(UserSubscription).filter(
            UserSubscription.stripe_customer_id == customer_id
        ).first()

    def create_subscription(
        self,
        user_id: int,
        stripe_customer_id: str = None,
        stripe_subscription_id: str = None,
        status: str = "free",
        plan_type: str = "free"
    ) -> UserSubscription:
        """Create a new subscription record"""
        subscription = UserSubscription(
            user_id=user_id,
            stripe_customer_id=stripe_customer_id,
            stripe_subscription_id=stripe_subscription_id,
            status=status,
            plan_type=plan_type
        )
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        return subscription

    def update_subscription(
        self,
        subscription_id: int,
        **kwargs
    ) -> Optional[UserSubscription]:
        """Update subscription fields"""
        subscription = self.db.query(UserSubscription).filter(
            UserSubscription.id == subscription_id
        ).first()

        if not subscription:
            return None

        for key, value in kwargs.items():
            if hasattr(subscription, key):
                setattr(subscription, key, value)

        subscription.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(subscription)
        return subscription

    def get_or_create_subscription(self, user_id: int) -> UserSubscription:
        """Get existing subscription or create a free one"""
        subscription = self.get_subscription_by_user(user_id)
        if not subscription:
            subscription = self.create_subscription(user_id)
        return subscription

    # ==================== Subscription History ====================

    def log_subscription_event(
        self,
        user_id: int,
        event_type: str,
        subscription_id: int = None,
        from_plan: str = None,
        to_plan: str = None,
        metadata: dict = None
    ) -> SubscriptionHistory:
        """Log a subscription event"""
        history = SubscriptionHistory(
            user_id=user_id,
            subscription_id=subscription_id,
            event_type=event_type,
            from_plan=from_plan,
            to_plan=to_plan,
            metadata_json=json.dumps(metadata) if metadata else None
        )
        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)
        return history

    def get_subscription_history(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Get subscription history for a user"""
        history = self.db.query(SubscriptionHistory).filter(
            SubscriptionHistory.user_id == user_id
        ).order_by(SubscriptionHistory.created_at.desc()).limit(limit).all()

        return [
            {
                "id": h.id,
                "event_type": h.event_type,
                "from_plan": h.from_plan,
                "to_plan": h.to_plan,
                "metadata": json.loads(h.metadata_json) if h.metadata_json else None,
                "created_at": str(h.created_at) if h.created_at else None
            }
            for h in history
        ]

    # ==================== Admin Queries ====================

    def get_subscription_stats(self) -> Dict[str, Any]:
        """Get subscription statistics for admin dashboard"""
        # Count by status
        status_counts = self.db.query(
            UserSubscription.status,
            func.count(UserSubscription.id)
        ).group_by(UserSubscription.status).all()

        # Count by plan
        plan_counts = self.db.query(
            UserSubscription.plan_type,
            func.count(UserSubscription.id)
        ).group_by(UserSubscription.plan_type).all()

        # Trials ending soon (within 7 days)
        trials_ending = self.db.query(func.count(UserSubscription.id)).filter(
            UserSubscription.status == 'trialing',
            UserSubscription.trial_end <= datetime.utcnow()
        ).scalar() or 0

        return {
            "by_status": {row[0]: row[1] for row in status_counts},
            "by_plan": {row[0]: row[1] for row in plan_counts},
            "trials_ending_soon": trials_ending
        }
