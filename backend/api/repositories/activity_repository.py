"""
Activity Repository - Data access for page views and activity tracking.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Dict, Any
from datetime import datetime, timedelta

from backend.models.user_schema import PageView
from backend.models.schema import AuditLog


class ActivityRepository:
    def __init__(self, db: Session):
        self.db = db

    # ==================== Page Views ====================

    def log_page_view(
        self,
        user_id: int,
        page_path: str,
        page_title: str = None,
        referrer: str = None,
        session_id: str = None,
        user_agent: str = None
    ) -> PageView:
        """Log a page view"""
        page_view = PageView(
            user_id=user_id,
            page_path=page_path,
            page_title=page_title,
            referrer=referrer,
            session_id=session_id,
            user_agent=user_agent
        )
        self.db.add(page_view)
        self.db.commit()
        return page_view

    def get_user_page_views(self, user_id: int, limit: int = 100) -> List[Dict[str, Any]]:
        """Get page views for a specific user"""
        views = self.db.query(PageView).filter(
            PageView.user_id == user_id
        ).order_by(PageView.created_at.desc()).limit(limit).all()

        return [
            {
                "id": v.id,
                "page_path": v.page_path,
                "page_title": v.page_title,
                "created_at": str(v.created_at) if v.created_at else None
            }
            for v in views
        ]

    def get_user_page_view_stats(self, user_id: int, days: int = 30) -> List[Dict[str, Any]]:
        """Get page view counts by page for a user"""
        cutoff = datetime.utcnow() - timedelta(days=days)

        result = self.db.execute(text("""
            SELECT page_path, COUNT(*) as count
            FROM page_view
            WHERE user_id = :user_id AND created_at >= :cutoff
            GROUP BY page_path
            ORDER BY count DESC
        """), {"user_id": user_id, "cutoff": cutoff})

        return [{"page_path": row[0], "count": row[1]} for row in result]

    # ==================== User Activity Timeline ====================

    def get_user_activity_timeline(self, user_id: int, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all activity events for a user from audit_log"""
        result = self.db.execute(text("""
            SELECT id, event_type, description, metadata_json, created_at
            FROM audit_log
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            LIMIT :limit
        """), {"user_id": str(user_id), "limit": limit})

        return [
            {
                "id": row[0],
                "event_type": row[1],
                "description": row[2],
                "metadata": row[3],
                "created_at": str(row[4]) if row[4] else None
            }
            for row in result
        ]

    # ==================== Admin Analytics ====================

    def get_most_visited_pages(self, days: int = 30, limit: int = 20) -> List[Dict[str, Any]]:
        """Get most visited pages across all users"""
        cutoff = datetime.utcnow() - timedelta(days=days)

        result = self.db.execute(text("""
            SELECT page_path, COUNT(*) as views, COUNT(DISTINCT user_id) as unique_users
            FROM page_view
            WHERE created_at >= :cutoff
            GROUP BY page_path
            ORDER BY views DESC
            LIMIT :limit
        """), {"cutoff": cutoff, "limit": limit})

        return [
            {"page_path": row[0], "views": row[1], "unique_users": row[2]}
            for row in result
        ]

    def get_page_views_over_time(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get daily page view counts"""
        cutoff = datetime.utcnow() - timedelta(days=days)

        result = self.db.execute(text("""
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM page_view
            WHERE created_at >= :cutoff
            GROUP BY DATE(created_at)
            ORDER BY date
        """), {"cutoff": cutoff})

        return [{"date": str(row[0]), "count": row[1]} for row in result]
