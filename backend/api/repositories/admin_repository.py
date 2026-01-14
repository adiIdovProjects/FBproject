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

    # ==================== Revenue Metrics ====================

    def get_paying_customers_count(self) -> int:
        """Count users with active paid subscriptions"""
        result = self.db.execute(text("""
            SELECT COUNT(DISTINCT user_id)
            FROM user_subscription
            WHERE status = 'active' AND plan_type != 'free'
        """))
        return result.scalar() or 0

    def get_subscription_stats(self) -> Dict[str, Any]:
        """Get subscription counts by status and plan"""
        # By status
        status_result = self.db.execute(text("""
            SELECT status, COUNT(*) as count
            FROM user_subscription
            GROUP BY status
        """))
        by_status = {row[0]: row[1] for row in status_result}

        # By plan
        plan_result = self.db.execute(text("""
            SELECT plan_type, COUNT(*) as count
            FROM user_subscription
            GROUP BY plan_type
        """))
        by_plan = {row[0]: row[1] for row in plan_result}

        # Trials ending soon (next 7 days)
        trials_ending = self.db.execute(text("""
            SELECT COUNT(*)
            FROM user_subscription
            WHERE status = 'trialing'
              AND trial_end IS NOT NULL
              AND trial_end <= NOW() + INTERVAL '7 days'
              AND trial_end > NOW()
        """)).scalar() or 0

        return {
            "by_status": by_status,
            "by_plan": by_plan,
            "trials_ending_soon": trials_ending
        }

    def get_churn_rate(self, days: int = 30) -> float:
        """Calculate churn rate for the period"""
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Cancelled in period
        cancelled = self.db.execute(text("""
            SELECT COUNT(*)
            FROM user_subscription
            WHERE cancelled_at >= :cutoff
        """), {"cutoff": cutoff}).scalar() or 0

        # Total active at start of period (approximation)
        total_active = self.db.execute(text("""
            SELECT COUNT(*)
            FROM user_subscription
            WHERE status IN ('active', 'cancelled')
        """)).scalar() or 0

        if total_active == 0:
            return 0.0

        return round((cancelled / total_active) * 100, 2)

    def get_trial_to_paid_conversion(self, days: int = 90) -> float:
        """Calculate trial to paid conversion rate"""
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Count users who started trial in period
        trials_started = self.db.execute(text("""
            SELECT COUNT(*)
            FROM subscription_history
            WHERE event_type = 'trial_start'
              AND created_at >= :cutoff
        """), {"cutoff": cutoff}).scalar() or 0

        if trials_started == 0:
            return 0.0

        # Count of those who then activated
        activated = self.db.execute(text("""
            SELECT COUNT(DISTINCT sh1.user_id)
            FROM subscription_history sh1
            WHERE sh1.event_type = 'trial_start'
              AND sh1.created_at >= :cutoff
              AND EXISTS (
                  SELECT 1 FROM subscription_history sh2
                  WHERE sh2.user_id = sh1.user_id
                    AND sh2.event_type = 'activated'
                    AND sh2.created_at > sh1.created_at
              )
        """), {"cutoff": cutoff}).scalar() or 0

        return round((activated / trials_started) * 100, 2)

    # ==================== Account Health Metrics ====================

    def get_account_health_overview(self) -> Dict[str, Any]:
        """Get overview of account health metrics"""
        # Total linked accounts
        total = self.db.execute(text("""
            SELECT COUNT(DISTINCT account_id) FROM user_ad_account
        """)).scalar() or 0

        # Accounts with recent data (last 7 days)
        active = self.db.execute(text("""
            SELECT COUNT(DISTINCT f.account_id)
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            WHERE d.date >= CURRENT_DATE - INTERVAL '7 days'
        """)).scalar() or 0

        # Stale accounts (no data in 7+ days but have historical data)
        stale = self.db.execute(text("""
            SELECT COUNT(DISTINCT ua.account_id)
            FROM user_ad_account ua
            WHERE ua.account_id IN (
                SELECT DISTINCT account_id FROM fact_core_metrics
            )
            AND ua.account_id NOT IN (
                SELECT DISTINCT f.account_id
                FROM fact_core_metrics f
                JOIN dim_date d ON f.date_id = d.date_id
                WHERE d.date >= CURRENT_DATE - INTERVAL '7 days'
            )
        """)).scalar() or 0

        return {
            "total_accounts": total,
            "active_accounts": active,
            "stale_accounts": stale,
            "no_data_accounts": total - active - stale if total > active + stale else 0
        }

    def get_total_spend(self, days: int = 30) -> float:
        """Get total spend across all accounts for period"""
        result = self.db.execute(text("""
            SELECT COALESCE(SUM(f.spend), 0)
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            WHERE d.date >= CURRENT_DATE - INTERVAL :days DAY
        """), {"days": days})
        return float(result.scalar() or 0)

    def get_account_last_sync_dates(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get last data date for each account"""
        result = self.db.execute(text("""
            SELECT
                ua.account_id,
                a.account_name,
                MAX(d.date) as last_data_date
            FROM user_ad_account ua
            LEFT JOIN dim_account a ON ua.account_id = a.account_id
            LEFT JOIN fact_core_metrics f ON ua.account_id = f.account_id
            LEFT JOIN dim_date d ON f.date_id = d.date_id
            GROUP BY ua.account_id, a.account_name
            ORDER BY last_data_date DESC NULLS LAST
            LIMIT :limit
        """), {"limit": limit})

        return [
            {
                "account_id": row[0],
                "account_name": row[1] or "Unknown",
                "last_data_date": str(row[2]) if row[2] else None
            }
            for row in result
        ]

    # ==================== Feature Adoption Metrics ====================

    def get_feature_usage_stats(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get feature usage statistics from page views"""
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Map page paths to features
        result = self.db.execute(text("""
            SELECT
                CASE
                    WHEN page_path LIKE '%/campaigns%' THEN 'campaigns'
                    WHEN page_path LIKE '%/creatives%' THEN 'creatives'
                    WHEN page_path LIKE '%/targeting%' THEN 'targeting'
                    WHEN page_path LIKE '%/insights%' THEN 'insights'
                    WHEN page_path LIKE '%/reports%' THEN 'reports'
                    WHEN page_path LIKE '%/uploader%' THEN 'uploader'
                    WHEN page_path LIKE '%/ai-investigator%' THEN 'ai_investigator'
                    WHEN page_path LIKE '%/account-dashboard%' THEN 'dashboard'
                    ELSE 'other'
                END as feature,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(*) as total_views
            FROM page_view
            WHERE created_at >= :cutoff
            GROUP BY feature
            ORDER BY unique_users DESC
        """), {"cutoff": cutoff})

        # Get total active users in period for adoption rate
        total_active = self.db.execute(text("""
            SELECT COUNT(DISTINCT user_id)
            FROM page_view
            WHERE created_at >= :cutoff
        """), {"cutoff": cutoff}).scalar() or 1

        return [
            {
                "feature": row[0],
                "unique_users": row[1],
                "total_views": row[2],
                "adoption_rate": round((row[1] / total_active) * 100, 1)
            }
            for row in result
            if row[0] != 'other'
        ]

    # ==================== Error Trends ====================

    def get_error_trends(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get error counts by day and type"""
        cutoff = datetime.utcnow() - timedelta(days=days)

        result = self.db.execute(text("""
            SELECT
                DATE(created_at) as date,
                event_type,
                COUNT(*) as count
            FROM audit_log
            WHERE created_at >= :cutoff
              AND (event_type LIKE '%ERROR%' OR event_type LIKE '%FAIL%')
            GROUP BY DATE(created_at), event_type
            ORDER BY date DESC
        """), {"cutoff": cutoff})

        # Group by date
        trends = {}
        for row in result:
            date_str = str(row[0])
            if date_str not in trends:
                trends[date_str] = {"date": date_str}
            trends[date_str][row[1]] = row[2]

        return list(trends.values())

    def get_error_summary(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get error counts grouped by type"""
        cutoff = datetime.utcnow() - timedelta(days=days)

        result = self.db.execute(text("""
            SELECT
                event_type,
                COUNT(*) as count,
                COUNT(DISTINCT user_id) as affected_users
            FROM audit_log
            WHERE created_at >= :cutoff
              AND (event_type LIKE '%ERROR%' OR event_type LIKE '%FAIL%')
            GROUP BY event_type
            ORDER BY count DESC
        """), {"cutoff": cutoff})

        return [
            {
                "error_type": row[0],
                "count": row[1],
                "affected_users": row[2]
            }
            for row in result
        ]
