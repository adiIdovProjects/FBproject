"""
Admin Service - Business logic for admin analytics dashboard.
"""

from sqlalchemy.orm import Session
from typing import Dict, Any, List
from backend.api.repositories.admin_repository import AdminRepository


class AdminService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = AdminRepository(db)

    def get_dashboard_metrics(self, days: int = 30) -> Dict[str, Any]:
        """Aggregate all admin dashboard metrics"""
        return {
            "user_metrics": {
                "total_users": self.repository.get_total_users(),
                "signups_over_time": self.repository.get_signups_over_time(days),
                "daily_active_users": self.repository.get_active_users("day"),
                "weekly_active_users": self.repository.get_active_users("week"),
                "monthly_active_users": self.repository.get_active_users("month"),
                "onboarding_completion_rate": self.repository.get_onboarding_completion_rate(),
            },
            "account_metrics": {
                "total_ad_accounts": self.repository.get_total_ad_accounts(),
                "unique_ad_accounts": self.repository.get_unique_ad_accounts(),
                "accounts_per_user": self.repository.get_accounts_per_user_distribution(),
            },
            "funnel_metrics": self.repository.get_funnel_metrics(days),
            "auth_breakdown": self.repository.get_auth_method_breakdown(days),
        }

    def get_user_metrics(self, days: int = 30) -> Dict[str, Any]:
        """Get detailed user metrics"""
        return {
            "total": self.repository.get_total_users(),
            "signups": self.repository.get_signups_over_time(days),
            "dau": self.repository.get_active_users("day"),
            "wau": self.repository.get_active_users("week"),
            "mau": self.repository.get_active_users("month"),
            "onboarding_rate": self.repository.get_onboarding_completion_rate(),
            "by_referral_source": self.repository.get_users_by_referral_source(),
            "by_job_title": self.repository.get_users_by_job_title(),
        }

    def get_funnel_metrics(self, days: int = 30) -> Dict[str, Any]:
        """Get onboarding funnel metrics"""
        funnel = self.repository.get_funnel_metrics(days)

        # Calculate conversion rates
        signups = funnel.get("signups", 0)
        if signups > 0:
            funnel["facebook_rate"] = round(
                (funnel.get("facebook_connected", 0) / signups) * 100, 1
            )
            funnel["accounts_rate"] = round(
                (funnel.get("accounts_linked", 0) / signups) * 100, 1
            )
            funnel["completion_rate"] = round(
                (funnel.get("onboarding_completed", 0) / signups) * 100, 1
            )
        else:
            funnel["facebook_rate"] = 0
            funnel["accounts_rate"] = 0
            funnel["completion_rate"] = 0

        return funnel

    def get_error_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent error events"""
        return self.repository.get_recent_errors(limit)

    def get_recent_activity(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent audit log activity"""
        return self.repository.get_recent_activity(limit)
