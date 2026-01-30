"""
Recommendations router - AI-powered recommendations for advertising.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.api.dependencies import get_db, get_current_user
from backend.api.repositories.user_repository import UserRepository
from backend.api.services.recommendation_service import RecommendationService
from typing import Optional

router = APIRouter(prefix="/api/v1/accounts", tags=["recommendations"])


def verify_account_access(account_id: str, user_id: int, db: Session) -> bool:
    """Verify user has access to account."""
    user_repo = UserRepository(db)
    user_account_ids = user_repo.get_user_account_ids(user_id)
    try:
        return int(account_id) in user_account_ids
    except ValueError:
        return False


@router.get("/{account_id}/recommendations/audience")
async def get_audience_recommendations(
    account_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI-powered audience targeting recommendations based on business profile.
    Returns suggested interests, demographics, countries, and languages.
    """
    if not verify_account_access(account_id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied to this account")

    service = RecommendationService(db)
    recommendations = service.get_audience_recommendations(int(account_id))

    if "error" in recommendations:
        raise HTTPException(status_code=400, detail=recommendations["error"])

    return recommendations


@router.get("/{account_id}/recommendations/ad-copy")
async def get_ad_copy_recommendations(
    account_id: str,
    objective: Optional[str] = Query("SALES", description="Campaign objective"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI-generated ad copy recommendations matching the brand's tone.
    Returns 3 variants with headline, primary text, description, and CTA.
    """
    if not verify_account_access(account_id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied to this account")

    service = RecommendationService(db)
    recommendations = service.get_ad_copy_recommendations(int(account_id), objective)

    if "error" in recommendations:
        raise HTTPException(status_code=400, detail=recommendations["error"])

    return recommendations


@router.get("/{account_id}/recommendations/creative-direction")
async def get_creative_direction(
    account_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get creative direction recommendations for ad content.
    Returns visual style, content angles, ad formats, and best practices.
    """
    if not verify_account_access(account_id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied to this account")

    service = RecommendationService(db)
    recommendations = service.get_creative_direction(int(account_id))

    if "error" in recommendations:
        raise HTTPException(status_code=400, detail=recommendations["error"])

    return recommendations
