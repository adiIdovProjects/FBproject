"""
Business profile router - Save and retrieve business profiles per ad account.
Triggers AI analysis of websites and social pages.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from backend.api.dependencies import get_db, get_current_user
from backend.api.repositories.user_repository import UserRepository
from backend.api.services.business_profile_service import BusinessProfileService

router = APIRouter(prefix="/api/v1/accounts", tags=["business-profile"])


class BusinessProfileRequest(BaseModel):
    website_url: Optional[str] = None
    business_description: Optional[str] = None


def verify_account_access(account_id: str, user_id: int, db: Session) -> bool:
    """Verify user has access to account."""
    user_repo = UserRepository(db)
    user_account_ids = user_repo.get_user_account_ids(user_id)
    try:
        return int(account_id) in user_account_ids
    except ValueError:
        return False


async def _run_analysis(db_session_factory, account_id: int, website_url: Optional[str], business_description: Optional[str], page_id: Optional[str], access_token: Optional[str]):
    """Background task to run full business profile analysis."""
    from backend.api.dependencies import SessionLocal
    db = SessionLocal()
    try:
        service = BusinessProfileService(db)

        # Fetch social posts if page_id available
        fb_posts = []
        ig_posts = []
        if page_id and access_token:
            try:
                from backend.api.services.ad_mutation_service import AdMutationService
                mutation_service = AdMutationService(access_token)
                fb_posts = mutation_service.get_page_posts(page_id, limit=25)
            except Exception:
                pass
            try:
                from backend.api.services.ad_mutation_service import AdMutationService
                mutation_service = AdMutationService(access_token)
                ig_posts = mutation_service.get_instagram_posts(page_id, limit=25)
            except Exception:
                pass

        await service.build_full_profile(
            account_id=account_id,
            website_url=website_url,
            business_description=business_description,
            fb_posts=fb_posts,
            ig_posts=ig_posts,
        )
    finally:
        db.close()


@router.post("/{account_id}/business-profile")
async def save_business_profile(
    account_id: str,
    data: BusinessProfileRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save business profile (URL or description) and trigger background AI analysis.
    """
    if not verify_account_access(account_id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied to this account")

    if not data.website_url and not data.business_description:
        raise HTTPException(status_code=400, detail="Provide a website URL or business description")

    acc_id = int(account_id)
    service = BusinessProfileService(db)
    service.save_profile(
        account_id=acc_id,
        website_url=data.website_url,
        business_description=data.business_description
    )

    # Get page_id for social analysis
    from backend.models.user_schema import UserAdAccount
    user_account = db.query(UserAdAccount).filter(
        UserAdAccount.user_id == current_user.id,
        UserAdAccount.account_id == acc_id
    ).first()
    page_id = user_account.page_id if user_account else None

    # Get Facebook access token
    access_token = None
    if hasattr(current_user, 'facebook_access_token') and current_user.facebook_access_token:
        from backend.utils.encryption_utils import decrypt_token
        try:
            access_token = decrypt_token(current_user.facebook_access_token)
        except Exception:
            access_token = current_user.facebook_access_token

    # Trigger background analysis
    background_tasks.add_task(
        _run_analysis, None, acc_id, data.website_url, data.business_description,
        str(page_id) if page_id else None, access_token
    )

    return {
        "success": True,
        "message": "Business profile saved, analysis started",
        "account_id": account_id,
        "analysis_status": "analyzing"
    }


@router.get("/{account_id}/business-profile")
async def get_business_profile(
    account_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the business profile for an account."""
    if not verify_account_access(account_id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied to this account")

    service = BusinessProfileService(db)
    profile = service.get_profile(int(account_id))

    if not profile:
        return {"has_profile": False, "data": None}

    return {"has_profile": True, "data": profile}
