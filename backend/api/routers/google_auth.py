from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from backend.api.dependencies import get_db
from backend.api.services.google_auth import GoogleAuthService
from backend.api.repositories.user_repository import UserRepository
from backend.api.utils.security import create_access_token
import os

router = APIRouter(prefix="/api/v1/auth/google", tags=["google_auth"])
google_service = GoogleAuthService()

@router.get("/login")
def login_google(state: str = "random_state_google"):
    """Step 1: Redirect to Google Login"""
    # Accept state from query parameter (for CSRF protection and return URL)
    # State can be JSON: {"csrf": "random", "return_to": "/en/reports"}
    # Falls back to default if not provided
    login_url = google_service.get_login_url(state)
    return RedirectResponse(login_url)

@router.get("/callback")
async def google_callback(code: str, state: str = None, db: Session = Depends(get_db)):
    """Step 2: Handle Google callback and create/update user"""
    try:
        import logging
        logger = logging.getLogger(__name__)

        # Parse state parameter to check for return URL
        state_data = {}
        if state:
            try:
                import json
                state_data = json.loads(state)
                logger.info(f"[Google OAuth] Parsed state: {state_data}")
            except:
                logger.warning(f"[Google OAuth] Failed to parse state: {state}")
                pass  # If state is not JSON, ignore and use default flow

        # 1. Exchange code for tokens
        token_data = await google_service.get_access_token(code)
        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        expires_at = token_data.get("expires_at")
        logger.info(f"[Google OAuth] Got access token")
        
        # 2. Get user info
        g_user = await google_service.get_user_info(access_token)
        
        # 3. Save to DB
        repo = UserRepository(db)
        from backend.models.user_schema import User
        
        # Check if user exists by google_id
        user = db.query(User).filter(User.google_id == g_user["sub"]).first()
        is_new_user = False

        if not user:
            # Check if user exists by email (primary or secondary)
            user = repo.get_user_by_any_email(g_user["email"])
            if user:
                # Link Google ID to existing user
                user.google_id = g_user["sub"]
                user.google_access_token = access_token
                user.google_refresh_token = refresh_token or user.google_refresh_token
                user.google_token_expires_at = expires_at
                user.email_verified = True
                # Google users need to connect Facebook
                if not user.fb_user_id:
                    user.onboarding_step = 'connect_facebook'
                db.commit()
            else:
                # Create NEW user
                user = User(
                    email=g_user["email"],
                    full_name=g_user.get("name"),
                    google_id=g_user["sub"],
                    google_access_token=access_token,
                    google_refresh_token=refresh_token,
                    google_token_expires_at=expires_at,
                    email_verified=True,
                    onboarding_completed=False,
                    onboarding_step='connect_facebook'  # Google users need FB connection
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                is_new_user = True
        else:
            # Update tokens for existing Google user
            user.google_access_token = access_token
            if refresh_token:
                user.google_refresh_token = refresh_token
            user.google_token_expires_at = expires_at
            db.commit()
            
        # 4. Create app JWT
        app_token = create_access_token(subject=user.id)

        # 5. Determine redirect based on state parameter or onboarding status
        from backend.config.base_config import settings

        # Priority 1: Check if state has return_to (for just-in-time auth flows)
        if state_data.get('return_to'):
            return_to = state_data['return_to']
            # Add google_connected flag and token to return URL
            separator = '&' if '?' in return_to else '?'
            redirect_url = f"{settings.FRONTEND_URL}{return_to}{separator}google_connected=true&token={app_token}"
            logger.info(f"[Google OAuth] Redirecting to return_to: {redirect_url}")
            return RedirectResponse(redirect_url)

        # Priority 2: Check if user has Facebook connected
        if not user.fb_user_id:
            # Needs to connect Facebook
            redirect_url = f"{settings.FRONTEND_URL}/en/onboard/connect-facebook?token={app_token}"
        elif is_new_user or not user.onboarding_completed:
            # Check onboarding status
            onboarding_status = repo.get_onboarding_status(user.id)
            next_step = onboarding_status.get('next_step', 'dashboard')

            if next_step == 'select_accounts':
                redirect_url = f"{settings.FRONTEND_URL}/en/select-accounts?token={app_token}"
            elif next_step == 'complete_profile':
                redirect_url = f"{settings.FRONTEND_URL}/en/quiz?token={app_token}"
            else:
                redirect_url = f"{settings.FRONTEND_URL}/en/dashboard?token={app_token}"
        else:
            # Returning user, go to dashboard
            redirect_url = f"{settings.FRONTEND_URL}/en/dashboard?token={app_token}"

        return RedirectResponse(redirect_url)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google Auth failed: {str(e)}")
