from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.api.dependencies import get_db, get_current_user
from backend.api.repositories.user_repository import UserRepository
from backend.api.schemas.requests import UserProfileUpdateRequest
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api/v1/users", tags=["users"])

class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    facebook_id: Optional[str] = None  # Note: frontend expects this field name
    google_id: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

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
        "is_active": getattr(current_user, 'is_active', True),
        "created_at": current_user.created_at if hasattr(current_user, 'created_at') else None
    }

class LinkedAccountResponse(BaseModel):
    account_id: str
    name: str
    currency: str

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
        
        files.append({
            "account_id": str(user_acc.account_id), # Convert BigInt to string for frontend safety
            "name": account_name,
            "currency": currency
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
    
    if link:
        # 1. Unlink first (prevent access)
        db.delete(link)
        db.commit()
        
        # 2. Cleanup data if requested
        if delete_data:
            from backend.api.services.cleanup_service import CleanupService
            cleanup = CleanupService(db)
            # Find if any other users are linked to this account?
            # ideally we only delete if NO other users are linked, 
            # OR we decide that this user "owns" the data import.
            # For now, let's assume if they ask to delete, we delete.
            # But safer check:
            other_links = db.query(UserAdAccount).filter(UserAdAccount.account_id == int(account_id)).count()
            if other_links == 0:
                cleanup.delete_account_data(int(account_id))
                return {"success": True, "message": "Account unlinked and data permanently deleted"}
            else:
                 return {"success": True, "message": "Account unlinked, but data preserved (other users have access)"}

        return {"success": True, "message": "Account unlinked successfully"}

    return {"success": False, "message": "Account not found or not linked"}


@router.patch("/me/profile", response_model=UserProfileResponse)
async def update_user_profile(
    profile_data: UserProfileUpdateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile from quiz.
    Updates full_name, job_title, years_experience, and referral_source.
    """
    user_repo = UserRepository(db)

    updated_user = user_repo.update_user_profile(
        user_id=current_user.id,
        full_name=profile_data.full_name,
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
        "is_active": True,
        "created_at": updated_user.created_at
    }
