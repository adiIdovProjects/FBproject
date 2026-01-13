"""
Admin Repository - SQL queries for admin analytics dashboard.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Dict, Any
from datetime import datetime, timedelta
from backend.models.user_schema import User, UserAdAccount
from backend.models.schema import AuditLog


class AdminRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_total_users(self) -> int:
        """Count total registered users"""
        return self.db.query(func.count(User.id)).scalar() or 0

    def get_signups_over_time(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get daily signup counts for the last N days"""
        cutoff = datetime.utcnow() - timedelta(days=days)

        result = self.db.execute(text("""
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM users
            WHERE created_at >= :cutoff
            GROUP BY DATE(created_at)
            ORDER BY date
        """), {"cutoff": cutoff})

        return [{"date": str(row[0]), "count": row[1]} for row in result]

    def get_active_users(self, period: str = "day") -> int:
        """Count active users based on audit_log activity"""
        if period == "day":
            cutoff = datetime.utcnow() - timedelta(days=1)
        elif period == "week":
            cutoff = datetime.utcnow() - timedelta(days=7)
        else:  # month
            cutoff = datetime.utcnow() - timedelta(days=30)

        result = self.db.execute(text("""
            SELECT COUNT(DISTINCT user_id)
            FROM audit_log
            WHERE created_at >= :cutoff
              AND user_id != 'system'
        """), {"cutoff": cutoff})

        return result.scalar() or 0

    def get_total_ad_accounts(self) -> int:
        """Count total connected ad accounts"""
        return self.db.query(func.count(UserAdAccount.account_id)).scalar() or 0

    def get_unique_ad_accounts(self) -> int:
        """Count unique ad accounts (some may be shared)"""
        return self.db.query(func.count(func.distinct(UserAdAccount.account_id))).scalar() or 0

    def get_accounts_per_user_distribution(self) -> Dict[str, int]:
        """Distribution of accounts per user (0, 1, 2, 3+)"""
        result = self.db.execute(text("""
            SELECT
                CASE
                    WHEN account_count = 0 THEN '0'
                    WHEN account_count = 1 THEN '1'
                    WHEN account_count = 2 THEN '2'
                    ELSE '3+'
                END as bucket,
                COUNT(*) as user_count
            FROM (
                SELECT u.id, COUNT(ua.account_id) as account_count
                FROM users u
                LEFT JOIN user_ad_account ua ON u.id = ua.user_id
                GROUP BY u.id
            ) subquery
            GROUP BY bucket
            ORDER BY bucket
        """))

        return {row[0]: row[1] for row in result}

    def get_funnel_metrics(self, days: int = 30) -> Dict[str, int]:
        """Get onboarding funnel metrics"""
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Total signups (users created in period)
        signups = self.db.execute(text("""
            SELECT COUNT(*) FROM users WHERE created_at >= :cutoff
        """), {"cutoff": cutoff}).scalar() or 0

        # Users who connected Facebook
        facebook_connected = self.db.execute(text("""
            SELECT COUNT(*) FROM users
            WHERE created_at >= :cutoff AND fb_user_id IS NOT NULL
        """), {"cutoff": cutoff}).scalar() or 0

        # Users who linked at least one account
        accounts_linked = self.db.execute(text("""
            SELECT COUNT(DISTINCT u.id)
            FROM users u
            INNER JOIN user_ad_account ua ON u.id = ua.user_id
            WHERE u.created_at >= :cutoff
        """), {"cutoff": cutoff}).scalar() or 0

        # Users who completed onboarding
        onboarding_completed = self.db.execute(text("""
            SELECT COUNT(*) FROM users
            WHERE created_at >= :cutoff AND onboarding_completed = TRUE
        """), {"cutoff": cutoff}).scalar() or 0

        return {
            "signups": signups,
            "facebook_connected": facebook_connected,
            "accounts_linked": accounts_linked,
            "onboarding_completed": onboarding_completed
        }

    def get_auth_method_breakdown(self, days: int = 30) -> List[Dict[str, Any]]:
        """Breakdown of authentication methods used"""
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Count by auth method based on user fields
        facebook = self.db.execute(text("""
            SELECT COUNT(*) FROM users
            WHERE created_at >= :cutoff
              AND fb_user_id IS NOT NULL
              AND google_id IS NULL
        """), {"cutoff": cutoff}).scalar() or 0

        google = self.db.execute(text("""
            SELECT COUNT(*) FROM users
            WHERE created_at >= :cutoff
              AND google_id IS NOT NULL
              AND fb_user_id IS NULL
        """), {"cutoff": cutoff}).scalar() or 0

        email_only = self.db.execute(text("""
            SELECT COUNT(*) FROM users
            WHERE created_at >= :cutoff
              AND fb_user_id IS NULL
              AND google_id IS NULL
        """), {"cutoff": cutoff}).scalar() or 0

        both = self.db.execute(text("""
            SELECT COUNT(*) FROM users
            WHERE created_at >= :cutoff
              AND fb_user_id IS NOT NULL
              AND google_id IS NOT NULL
        """), {"cutoff": cutoff}).scalar() or 0

        return [
            {"method": "Facebook", "count": facebook},
            {"method": "Google", "count": google},
            {"method": "Email/Magic Link", "count": email_only},
            {"method": "Multiple", "count": both}
        ]

    def get_recent_errors(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent error events from audit log"""
        result = self.db.execute(text("""
            SELECT id, user_id, event_type, description, metadata_json, created_at
            FROM audit_log
            WHERE event_type LIKE '%ERROR%'
               OR event_type LIKE '%FAIL%'
            ORDER BY created_at DESC
            LIMIT :limit
        """), {"limit": limit})

        return [
            {
                "id": row[0],
                "user_id": row[1],
                "event_type": row[2],
                "description": row[3],
                "metadata": row[4],
                "created_at": str(row[5]) if row[5] else None
            }
            for row in result
        ]

    def get_recent_activity(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent audit log events"""
        result = self.db.execute(text("""
            SELECT id, user_id, event_type, description, created_at
            FROM audit_log
            ORDER BY created_at DESC
            LIMIT :limit
        """), {"limit": limit})

        return [
            {
                "id": row[0],
                "user_id": row[1],
                "event_type": row[2],
                "description": row[3],
                "created_at": str(row[4]) if row[4] else None
            }
            for row in result
        ]

    def get_onboarding_completion_rate(self) -> float:
        """Calculate onboarding completion rate"""
        total = self.db.query(func.count(User.id)).scalar() or 0
        if total == 0:
            return 0.0

        completed = self.db.query(func.count(User.id)).filter(
            User.onboarding_completed == True
        ).scalar() or 0

        return round((completed / total) * 100, 2)

    def get_users_by_referral_source(self) -> List[Dict[str, Any]]:
        """Group users by referral source"""
        result = self.db.execute(text("""
            SELECT
                COALESCE(referral_source, 'Not specified') as source,
                COUNT(*) as count
            FROM users
            GROUP BY referral_source
            ORDER BY count DESC
        """))

        return [{"source": row[0], "count": row[1]} for row in result]

    def get_users_by_job_title(self) -> List[Dict[str, Any]]:
        """Group users by job title"""
        result = self.db.execute(text("""
            SELECT
                COALESCE(job_title, 'Not specified') as job_title,
                COUNT(*) as count
            FROM users
            GROUP BY job_title
            ORDER BY count DESC
            LIMIT 10
        """))

        return [{"job_title": row[0], "count": row[1]} for row in result]
