"""
Pixel Event Scanner Router.

Endpoints for scanning pixel health, events, and optimization summaries.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from sqlalchemy.orm import Session

from backend.api.dependencies import get_db, get_current_user
from backend.api.services.pixel_service import PixelService
from backend.models.user_schema import User

router = APIRouter(
    prefix="/api/v1/pixels",
    tags=["pixels"],
    responses={404: {"description": "Not found"}},
)


def _get_pixel_service(user: User = Depends(get_current_user)) -> PixelService:
    if not user.fb_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not connected to Facebook"
        )
    return PixelService(access_token=user.decrypted_fb_token)


@router.get("/{account_id}")
def get_account_pixels(
    account_id: str,
    service: PixelService = Depends(_get_pixel_service),
):
    """List pixels for an ad account with health status."""
    pixels = service.get_account_pixels(account_id)
    return {"pixels": pixels, "count": len(pixels)}


@router.get("/{account_id}/events")
def get_optimization_summary(
    account_id: str,
    page_id: Optional[str] = Query(None, description="Facebook Page ID for lead form lookup"),
    service: PixelService = Depends(_get_pixel_service),
    db: Session = Depends(get_db),
):
    """
    Full optimization summary: pixel events, active objectives, lead forms, and smart warnings.
    Use this when building campaigns to know what optimization events are available.
    """
    return service.get_optimization_summary(account_id, db, page_id)


@router.get("/stats/{pixel_id}")
def get_pixel_stats(
    pixel_id: str,
    days: int = Query(30, ge=1, le=90, description="Number of days to look back"),
    service: PixelService = Depends(_get_pixel_service),
):
    """Get detailed event stats for a single pixel."""
    events = service.get_pixel_event_stats(pixel_id, days)
    return {"pixel_id": pixel_id, "days": days, "events": events}
