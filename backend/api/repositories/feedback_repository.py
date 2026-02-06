"""
Repository for user feedback CRUD operations.
"""
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from backend.models.user_schema import Feedback


class FeedbackRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_feedback(self, data: dict) -> Feedback:
        """Create new feedback entry."""
        feedback = Feedback(
            user_id=data['user_id'],
            feedback_type=data['feedback_type'],
            title=data['title'],
            message=data['message'],
            rating=data.get('rating'),
            page_path=data.get('page_path')
        )
        self.db.add(feedback)
        self.db.commit()
        self.db.refresh(feedback)
        return feedback

    def get_by_id(self, feedback_id: int) -> Optional[Feedback]:
        """Get feedback by ID."""
        return self.db.query(Feedback).filter(Feedback.id == feedback_id).first()

    def get_user_feedback(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all feedback from a specific user."""
        feedbacks = self.db.query(Feedback).filter(
            Feedback.user_id == user_id
        ).order_by(Feedback.created_at.desc()).limit(limit).all()

        return [
            {
                "id": f.id,
                "feedback_type": f.feedback_type,
                "title": f.title,
                "message": f.message,
                "rating": f.rating,
                "status": f.status,
                "created_at": str(f.created_at) if f.created_at else None
            }
            for f in feedbacks
        ]

    def get_all_feedback(self, limit: int = 100, offset: int = 0, status: str = None) -> Dict[str, Any]:
        """Get paginated feedback for admin panel."""
        query = self.db.query(Feedback)

        if status:
            query = query.filter(Feedback.status == status)

        total = query.count()

        feedbacks = query.order_by(
            Feedback.created_at.desc()
        ).offset(offset).limit(limit).all()

        return {
            "feedback": [
                {
                    "id": f.id,
                    "user_id": f.user_id,
                    "feedback_type": f.feedback_type,
                    "title": f.title,
                    "message": f.message,
                    "rating": f.rating,
                    "page_path": f.page_path,
                    "status": f.status,
                    "admin_notes": f.admin_notes,
                    "created_at": str(f.created_at) if f.created_at else None
                }
                for f in feedbacks
            ],
            "total": total,
            "limit": limit,
            "offset": offset
        }

    def update_status(self, feedback_id: int, status: str, admin_notes: str = None) -> Optional[Feedback]:
        """Update feedback status (admin action)."""
        feedback = self.get_by_id(feedback_id)

        if feedback:
            feedback.status = status
            if admin_notes is not None:
                feedback.admin_notes = admin_notes
            self.db.commit()
            self.db.refresh(feedback)

        return feedback
