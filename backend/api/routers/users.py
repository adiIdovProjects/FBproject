from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.dependencies import get_db, get_current_user
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
