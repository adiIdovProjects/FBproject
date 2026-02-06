"""
Service layer for user feedback operations.
"""
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from backend.api.repositories.feedback_repository import FeedbackRepository


VALID_FEEDBACK_TYPES = ['bug', 'feature_request', 'improvement', 'other']
VALID_STATUSES = ['new', 'acknowledged', 'in_progress', 'closed']


class FeedbackService:
    def __init__(self, db: Session):
        self.db = db
        self.feedback_repo = FeedbackRepository(db)

    def submit_feedback(
        self,
        user_id: int,
        feedback_type: str,
        title: str,
        message: str,
        rating: int = None,
        page_path: str = None
    ) -> Dict[str, Any]:
        """Submit new user feedback."""

        # Validate feedback type
        if feedback_type not in VALID_FEEDBACK_TYPES:
            raise ValueError(f"Invalid feedback type. Must be one of: {VALID_FEEDBACK_TYPES}")

        # Validate rating if provided
        if rating is not None and (rating < 1 or rating > 5):
            raise ValueError("Rating must be between 1 and 5")

        # Create feedback
        feedback = self.feedback_repo.create_feedback({
            'user_id': user_id,
            'feedback_type': feedback_type,
            'title': title.strip(),
            'message': message.strip(),
            'rating': rating,
            'page_path': page_path
        })

        return {
            'id': feedback.id,
            'status': 'ok',
            'message': 'Feedback submitted successfully'
        }

    def get_user_feedback(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all feedback submitted by a user."""
        return self.feedback_repo.get_user_feedback(user_id)

    def get_all_feedback_admin(
        self,
        limit: int = 100,
        offset: int = 0,
        status: str = None
    ) -> Dict[str, Any]:
        """Get all feedback for admin panel."""
        if status and status not in VALID_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {VALID_STATUSES}")

        return self.feedback_repo.get_all_feedback(limit, offset, status)

    def update_feedback_status(
        self,
        feedback_id: int,
        status: str,
        admin_notes: str = None
    ) -> Dict[str, Any]:
        """Admin: update feedback status."""

        if status not in VALID_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {VALID_STATUSES}")

        feedback = self.feedback_repo.update_status(feedback_id, status, admin_notes)

        if not feedback:
            raise ValueError("Feedback not found")

        return {'status': 'ok', 'message': 'Feedback updated successfully'}
