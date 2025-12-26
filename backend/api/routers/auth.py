from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from api.dependencies import get_db
from api.services.facebook_auth import FacebookAuthService
from api.repositories.user_repository import UserRepository
from api.utils.security import create_access_token
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/auth", tags=["auth"])
fb_service = FacebookAuthService()

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class AdAccountSchema(BaseModel):
    account_id: str
    name: str
    currency: str

@router.get("/facebook/login")
def login_facebook():
    """Step 1: Redirect to Facebook Login"""
    state = "random_state_here" # In prod, use a secure CSRF token
    login_url = fb_service.get_login_url(state)
    return RedirectResponse(login_url)

@router.get("/facebook/callback")
async def facebook_callback(code: str, db: Session = Depends(get_db)):
    """Step 2: Handle Facebook callback and create/update user"""
    try:
        # 1. Exchange code for short-lived token
        token_data = await fb_service.get_access_token(code)
        short_token = token_data["access_token"]
        
        # 2. Exchange for long-lived token
        long_token_data = await fb_service.get_long_lived_token(short_token)
        access_token = long_token_data["access_token"]
        expires_at = long_token_data.get("expires_at")
        
        # 3. Get user info from FB
        fb_user = fb_service.get_user_info(access_token)
        
        # 4. Save to DB
        repo = UserRepository(db)
        user = repo.get_user_by_fb_id(fb_user["id"])
        
        if not user:
            # Check if user exists by email
            user = repo.get_user_by_email(fb_user.get("email"))
            if user:
                # Update existing user with FB ID
                user.fb_user_id = fb_user["id"]
                user.fb_access_token = access_token
                user.fb_token_expires_at = expires_at
                db.commit()
            else:
                user = repo.create_user(
                    email=fb_user.get("email", f"{fb_user['id']}@facebook.com"),
                    fb_user_id=fb_user["id"],
                    full_name=fb_user["name"],
                    access_token=access_token,
                    expires_at=expires_at
                )
        else:
            repo.update_fb_token(user.id, access_token, expires_at)
        
        # 5. Create app JWT
        app_token = create_access_token(subject=user.id)
        
        # Redirect back to frontend with token
        # In a real app, you might use a cookie or a secure redirect
        frontend_url = "http://localhost:3001/connect"
        return RedirectResponse(f"{frontend_url}?token={app_token}")
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Facebook Auth failed: {str(e)}")

@router.get("/facebook/accounts", response_model=List[AdAccountSchema])
async def get_facebook_accounts(db: Session = Depends(get_db)):
    """Fetch available ad accounts from Facebook for the current user"""
    # NOTE: In a real app, you would get the user from the JWT (Depends on get_current_user)
    # For now, we'll assume there's a way to identify the user
    # I'll implement a mock user since I don't have the auth middleware fully set up yet
    user_id = 1 # Hardcoded for now
    repo = UserRepository(db)
    user = db.query(repo.db.query(repo.model).get(user_id)).first() # Pseudo-code
    
    # Correct way:
    from models.user_schema import User
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or not user.fb_access_token:
        raise HTTPException(status_code=401, detail="Facebook not connected")
    
    accounts = fb_service.get_managed_accounts(user.fb_access_token)
    return accounts
