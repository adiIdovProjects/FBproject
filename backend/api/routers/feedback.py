"""
API router for user feedback endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from backend.api.dependencies import get_db, get_current_user, get_current_admin
from backend.api.services.feedback_service import FeedbackService


router = APIRouter(
    prefix="/api/v1/feedback",
    tags=["feedback"],
)


# Pydantic schemas
class FeedbackSubmitRequest(BaseModel):
    feedback_type: str  # bug, feature_request, improvement, other
    title: str
    message: str
    rating: Optional[int] = None  # 1-5


class FeedbackStatusUpdate(BaseModel):
    status: str  # new, acknowledged, in_progress, closed
    admin_notes: Optional[str] = None


# User endpoints
@router.post("/")
async def submit_feedback(
    data: FeedbackSubmitRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Submit user feedback."""
    service = FeedbackService(db)

    try:
        result = service.submit_feedback(
            user_id=current_user.id,
            feedback_type=data.feedback_type,
            title=data.title,
            message=data.message,
            rating=data.rating,
            page_path=str(request.headers.get("referer", ""))
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/mine")
async def get_my_feedback(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get current user's feedback submissions."""
    service = FeedbackService(db)
    return service.get_user_feedback(current_user.id)


# Admin endpoints
@router.get("/admin")
async def get_all_feedback_admin(
    limit: int = 100,
    offset: int = 0,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Get all feedback (admin only)."""
    service = FeedbackService(db)

    try:
        return service.get_all_feedback_admin(limit, offset, status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/admin/{feedback_id}")
async def update_feedback_status_admin(
    feedback_id: int,
    data: FeedbackStatusUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Update feedback status (admin only)."""
    service = FeedbackService(db)

    try:
        return service.update_feedback_status(
            feedback_id=feedback_id,
            status=data.status,
            admin_notes=data.admin_notes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
