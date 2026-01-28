from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from backend.api.dependencies import get_db, get_current_user
from backend.api.repositories.user_repository import UserRepository
from backend.api.schemas.requests import UserProfileUpdateRequest
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/users", tags=["users"])

class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    facebook_id: Optional[str] = None  # Note: frontend expects this field name
    google_id: Optional[str] = None
    job_title: Optional[str] = None
    years_experience: Optional[str] = None
    timezone: Optional[str] = 'UTC'
    is_active: bool = True
    is_admin: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TimezoneUpdateRequest(BaseModel):
    timezone: str  # e.g., "America/New_York", "Europe/London"

@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(current_user=Depends(get_current_user)):
    """
    Get current authenticated user's profile.
    Returns user data including OAuth connection status.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name if hasattr(current_user, 'full_name') else None,
        "facebook_id": current_user.fb_user_id if hasattr(current_user, 'fb_user_id') else None,  # Map schema field to frontend expectation
        "google_id": current_user.google_id if hasattr(current_user, 'google_id') else None,
        "job_title": current_user.job_title if hasattr(current_user, 'job_title') else None,
        "years_experience": current_user.years_experience if hasattr(current_user, 'years_experience') else None,
        "timezone": getattr(current_user, 'timezone', 'UTC'),
        "is_active": getattr(current_user, 'is_active', True),
        "is_admin": getattr(current_user, 'is_admin', False),
        "created_at": current_user.created_at if hasattr(current_user, 'created_at') else None
    }

class LinkedAccountResponse(BaseModel):
    account_id: str
    name: str
    currency: str
    page_id: str | None = None
    page_name: str | None = None

@router.get("/me/accounts", response_model=list[LinkedAccountResponse])
async def get_my_accounts(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of ad accounts linked to the current user.
    """
    # Access the relationship directly
    # Note: Ensure the relationship is eager loaded or session is active (FastAPI dependency handles session)
    files = []
    for user_acc in current_user.ad_accounts:
        # UserAdAccount has .account relationship to DimAccount
        account_name = user_acc.account.account_name if user_acc.account else f"Account {user_acc.account_id}"
        currency = user_acc.account.currency if user_acc.account else "USD"
        page_id = user_acc.page_id if hasattr(user_acc, 'page_id') else None
        page_name = user_acc.page_name if hasattr(user_acc, 'page_name') else None

        files.append({
            "account_id": str(user_acc.account_id), # Convert BigInt to string for frontend safety
            "name": account_name,
            "currency": currency,
            "page_id": page_id,
            "page_name": page_name
        })
    return files

@router.delete("/me/accounts/{account_id}")
async def unlink_account(
    account_id: str,
    delete_data: bool = False,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unlink an ad account from the current user.
    If delete_data is True, permanently removes all imported data for this account.
    """
    from backend.models.user_schema import UserAdAccount

    # Check if link exists
    link = db.query(UserAdAccount).filter(
        UserAdAccount.user_id == current_user.id,
        UserAdAccount.account_id == int(account_id)
    ).first()

    if not link:
        return {"success": False, "message": "Account not found or not linked"}

    # Unlink first (prevent access)
    db.delete(link)
    db.commit()

    # Cleanup data if requested
    if delete_data:
        from backend.api.services.cleanup_service import CleanupService
        cleanup = CleanupService(db)
        cleanup.delete_account_data(int(account_id))
        return {"success": True, "message": "Account unlinked and data permanently deleted"}

    return {"success": True, "message": "Account unlinked successfully"}


@router.patch("/me/profile", response_model=UserProfileResponse)
async def update_user_profile(
    profile_data: UserProfileUpdateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile from quiz.
    Updates profile fields including platform_reason, company_type, and role_with_ads.
    """
    user_repo = UserRepository(db)

    updated_user = user_repo.update_user_profile(
        user_id=current_user.id,
        full_name=profile_data.full_name,
        platform_reason=profile_data.platform_reason,
        company_type=profile_data.company_type,
        role_with_ads=profile_data.role_with_ads,
        job_title=profile_data.job_title,
        years_experience=profile_data.years_experience,
        referral_source=profile_data.referral_source
    )

    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": updated_user.id,
        "email": updated_user.email,
        "full_name": updated_user.full_name,
        "facebook_id": updated_user.fb_user_id,
        "google_id": updated_user.google_id,
        "platform_reason": updated_user.platform_reason,
        "company_type": updated_user.company_type,
        "role_with_ads": updated_user.role_with_ads,
        "job_title": updated_user.job_title,
        "years_experience": updated_user.years_experience,
        "referral_source": updated_user.referral_source,
        "timezone": getattr(updated_user, 'timezone', 'UTC'),
        "is_active": True,
        "created_at": updated_user.created_at
    }

@router.patch("/me/timezone")
async def update_timezone(
    request: TimezoneUpdateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user's timezone preference.
    Called automatically on login to sync browser timezone.
    """
    # Validate timezone string (basic check)
    import pytz
    try:
        pytz.timezone(request.timezone)
    except pytz.UnknownTimeZoneError:
        raise HTTPException(status_code=400, detail=f"Invalid timezone: {request.timezone}")

    # Update user
    current_user.timezone = request.timezone
    db.commit()

    return {"success": True, "timezone": request.timezone}


@router.delete("/me")
async def delete_my_account(
    response: Response,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GDPR Article 17: Right to Erasure
    Permanently delete user account and all associated data.
    This action is irreversible.

    Deletes:
    - User profile
    - All linked ad accounts data
    - Subscription records
    - Page view history
    - Activity logs
    """
    from backend.models.user_schema import User, UserAdAccount, UserSubscription, SubscriptionHistory, PageView
    from backend.api.services.cleanup_service import CleanupService

    user_id = current_user.id
    user_email = current_user.email

    logger.info(f"User deletion requested for user_id={user_id}, email={user_email}")

    try:
        # 1. Delete all ad account data for each linked account
        cleanup = CleanupService(db)
        account_ids = [acc.account_id for acc in current_user.ad_accounts]
        for account_id in account_ids:
            try:
                cleanup.delete_account_data(account_id)
                logger.info(f"Deleted ad data for account_id={account_id}")
            except Exception as e:
                logger.error(f"Error deleting ad data for account_id={account_id}: {e}")

        # 2. Delete page views
        db.query(PageView).filter(PageView.user_id == user_id).delete()
        logger.info(f"Deleted page views for user_id={user_id}")

        # 3. Delete subscription history
        db.query(SubscriptionHistory).filter(SubscriptionHistory.user_id == user_id).delete()
        logger.info(f"Deleted subscription history for user_id={user_id}")

        # 4. Delete subscription
        db.query(UserSubscription).filter(UserSubscription.user_id == user_id).delete()
        logger.info(f"Deleted subscription for user_id={user_id}")

        # 5. Delete user ad account links (cascade should handle this, but be explicit)
        db.query(UserAdAccount).filter(UserAdAccount.user_id == user_id).delete()
        logger.info(f"Deleted ad account links for user_id={user_id}")

        # 6. Delete the user record
        db.query(User).filter(User.id == user_id).delete()
        logger.info(f"Deleted user record for user_id={user_id}")

        # Commit all deletions
        db.commit()

        # Clear the auth cookie
        response.delete_cookie(
            key="auth_token",
            path="/",
            secure=True,
            httponly=True,
            samesite="lax"
        )

        logger.info(f"User deletion completed successfully for user_id={user_id}")

        return {
            "success": True,
            "message": "Your account and all associated data have been permanently deleted.",
            "deleted_accounts": len(account_ids)
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete user account user_id={user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete account. Please contact support."
        )
