from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from api.dependencies import get_db
from api.services.google_auth import GoogleAuthService
from api.repositories.user_repository import UserRepository
from api.utils.security import create_access_token
import os

router = APIRouter(prefix="/auth/google", tags=["google_auth"])
google_service = GoogleAuthService()

@router.get("/login")
def login_google():
    """Step 1: Redirect to Google Login"""
    state = "random_state_google" # Should be secure in prod
    login_url = google_service.get_login_url(state)
    return RedirectResponse(login_url)

@router.get("/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Step 2: Handle Google callback and create/update user"""
    try:
        # 1. Exchange code for tokens
        token_data = await google_service.get_access_token(code)
        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        expires_at = token_data.get("expires_at")
        
        # 2. Get user info
        g_user = await google_service.get_user_info(access_token)
        
        # 3. Save to DB
        repo = UserRepository(db)
        # Check if user exists by google_id or email
        user = db.query(repo.db.query(repo.model).filter(repo.model.google_id == g_user["sub"])).first() # Pseudo-code
        
        from models.user_schema import User
        user = db.query(User).filter(User.google_id == g_user["sub"]).first()
        
        if not user:
            user = db.query(User).filter(User.email == g_user["email"]).first()
            if user:
                # Update existing user
                user.google_id = g_user["sub"]
                user.google_access_token = access_token
                user.google_refresh_token = refresh_token or user.google_refresh_token
                user.google_token_expires_at = expires_at
                db.commit()
            else:
                user = User(
                    email=g_user["email"],
                    full_name=g_user.get("name"),
                    google_id=g_user["sub"],
                    google_access_token=access_token,
                    google_refresh_token=refresh_token,
                    google_token_expires_at=expires_at
                )
                db.add(user)
                db.commit()
                db.refresh(user)
        else:
            # Update tokens
            user.google_access_token = access_token
            if refresh_token:
                user.google_refresh_token = refresh_token
            user.google_token_expires_at = expires_at
            db.commit()
            
        # 4. Create app JWT
        app_token = create_access_token(subject=user.id)
        
        # Step 3: Redirect to Facebook connection
        # The frontend will pick up the token and show "Step 2: Connect Facebook"
        frontend_url = "http://localhost:3001/connect"
        return RedirectResponse(f"{frontend_url}?token={app_token}&step=google_done")
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google Auth failed: {str(e)}")
