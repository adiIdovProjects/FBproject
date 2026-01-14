"""
Activity Router - API endpoints for tracking page views and feature usage.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any

from backend.api.dependencies import get_db, get_current_user
from backend.api.services.activity_service import ActivityService

router = APIRouter(
    prefix="/api/v1/activity",
    tags=["activity"],
)


class PageViewRequest(BaseModel):
    page_path: str
    page_title: Optional[str] = None
    referrer: Optional[str] = None
    session_id: Optional[str] = None


class FeatureRequest(BaseModel):
    feature_name: str
    metadata: Optional[Dict[str, Any]] = None


@router.post("/page-view")
async def track_page_view(
    data: PageViewRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Track a page view"""
    service = ActivityService(db)

    user_agent = request.headers.get("user-agent")

    service.track_page_view(
        user_id=current_user.id,
        page_path=data.page_path,
        page_title=data.page_title,
        referrer=data.referrer,
        session_id=data.session_id,
        user_agent=user_agent
    )

    return {"status": "ok"}


@router.post("/feature")
async def track_feature(
    data: FeatureRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Track feature usage"""
    service = ActivityService(db)

    service.track_feature_usage(
        user_id=current_user.id,
        feature_name=data.feature_name,
        metadata=data.metadata
    )

    return {"status": "ok"}
