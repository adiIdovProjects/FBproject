import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Response, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from backend.api.dependencies import get_db, get_current_user
from backend.api.services.facebook_auth import FacebookAuthService
from backend.api.repositories.user_repository import UserRepository
from backend.api.repositories.magic_link_repository import MagicLinkRepository
from backend.api.services.audit_service import AuditService
from backend.api.services.email_service import send_magic_link
from backend.api.utils.security import create_access_token, verify_password, get_password_hash
from backend.api.routers.sync import init_sync_status, update_sync_status, mark_sync_completed, mark_sync_failed
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from backend.utils.logging_utils import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
fb_service = FacebookAuthService()

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class AdAccountSchema(BaseModel):
    account_id: str
    name: str
    currency: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class MagicLinkRequest(BaseModel):
    email: EmailStr

class MagicLinkVerifyResponse(BaseModel):
    access_token: str
    token_type: str
    onboarding_status: dict

@router.get("/facebook/login")
def login_facebook(state: str):
    """Initiate Facebook Login flow (Unauthenticated)"""
    login_url = fb_service.get_login_url(state)
    return RedirectResponse(login_url)

@router.get("/facebook/connect")
def connect_facebook(current_user=Depends(get_current_user)):
    """Step 1 (Connect): Redirect to Facebook Login to link account"""
    # Create a signed state containing the user ID and intent
    state_payload = {
        "user_id": current_user.id,
        "type": "connect",
        "nonce": str(uuid.uuid4())
    }
    from backend.config.base_config import settings
    from jose import jwt
    state = jwt.encode(state_payload, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
    
    login_url = fb_service.get_login_url(state)
    return {"url": login_url}

@router.get("/facebook/callback")
async def facebook_callback(code: str, state: str, db: Session = Depends(get_db)):
    """Step 2: Handle Facebook callback and create/update user"""
    try:
        # Check if state is a "connect" state
        connect_user_id = None
        is_connect_flow = False
        frontend_redirect_path = ""
        
        logger.info(f"DEBUG: Processing callback with state: {state}")

        
        try:
            from backend.config.base_config import settings
            from jose import jwt
            # Attempt to decode state as JWT
            decoded_state = jwt.decode(state, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
            logger.info(f"DEBUG: Decoded state: {decoded_state}")
            if decoded_state.get("type") == "connect":
                connect_user_id = decoded_state.get("user_id")
                is_connect_flow = True
                frontend_redirect_path = "/select-accounts"
                logger.info("DEBUG: Detected CONNECT flow")
        except Exception as e:
            logger.error(f"DEBUG: State decoding failed: {e}")
            # Not a JWT or invalid signature, treat as normal login flow
            pass

        # 1. Exchange code for short-lived token
        token_data = await fb_service.get_access_token(code)
        short_token = token_data["access_token"]
        
        # 2. Exchange for long-lived token
        long_token_data = await fb_service.get_long_lived_token(short_token)
        access_token = long_token_data["access_token"]
        expires_at = long_token_data.get("expires_at")
        
        # 3. Get user info from FB
        fb_user = fb_service.get_user_info(access_token)
        
        repo = UserRepository(db)
        user = None

        if is_connect_flow and connect_user_id:
            # CONNECT FLOW: Update the specific user
            user = repo.get_user_by_id(connect_user_id)
            if user:
                # Link this FB account to the existing user
                user.fb_user_id = fb_user["id"]
                user.fb_access_token = access_token
                user.fb_token_expires_at = expires_at
                db.commit()
                
                # Audit log
                AuditService.log_event(
                    db=db,
                    user_id=str(user.id),
                    event_type="ACCOUNT_LINKED",
                    description=f"User {user.email} connected Facebook Account {fb_user.get('name')}",
                    metadata={"fb_user_id": fb_user["id"]}
                )
        else:
            # LOGIN FLOW: Create or Get User
            user = repo.get_user_by_fb_id(fb_user["id"])
            is_new_user = False

            if not user:
                # Check if user exists by email
                user = repo.get_user_by_email(fb_user.get("email"))
                if user:
                    # Update existing user with FB ID
                    user.fb_user_id = fb_user["id"]
                    user.fb_access_token = access_token
                    user.fb_token_expires_at = expires_at
                    user.email_verified = True
                    user.onboarding_step = 'select_accounts'
                    db.commit()
                else:
                    # New user via Facebook
                    user = repo.create_user(
                        email=fb_user.get("email", f"{fb_user['id']}@facebook.com"),
                        fb_user_id=fb_user["id"],
                        full_name=fb_user["name"],
                        access_token=access_token,
                        expires_at=expires_at
                    )
                    user.email_verified = True
                    user.onboarding_step = 'select_accounts'
                    db.commit()
                    is_new_user = True
            else:
                repo.update_fb_token(user.id, access_token, expires_at)

            # Audit log successful login
            AuditService.log_event(
                db=db,
                user_id=str(user.id),
                event_type="LOGIN_SUCCESS" if not is_new_user else "USER_CREATED",
                description=f"User {user.email} logged in via Facebook",
                metadata={"email": user.email, "fb_user_id": user.fb_user_id}
            )

        # 5. Create app JWT (always needed for redirect)
        app_token = create_access_token(subject=user.id)
        
        # Redirect back to frontend
        from backend.config.base_config import settings
        frontend_base = settings.FACEBOOK_OAUTH_REDIRECT_URL.split('?')[0] # Remove any query params if present in config
        # If FACEBOOK_OAUTH_REDIRECT_URL is http://localhost:3000, we append
        
        if is_connect_flow:
            # Redirect to settings with success flag
            separator = "&" if "?" in frontend_redirect_path else "?"
            return RedirectResponse(f"{settings.FRONTEND_URL}{frontend_redirect_path}{separator}connect_success=true")
        else:
             # Normal login redirect
            return RedirectResponse(f"{settings.FACEBOOK_OAUTH_REDIRECT_URL}?token={app_token}&state={state}")
        
    except Exception as e:
        logger.error(f"Facebook Auth failed: {str(e)}", exc_info=True)
        error_msg = str(e)
        from backend.config.base_config import settings
        logger.error(f"DEBUG: Exception caught. Redirecting to settings. Msg: {error_msg}")
        if "connect" in state:
             return RedirectResponse(f"{settings.FRONTEND_URL}/settings?tab=accounts&error={error_msg}")
        raise HTTPException(status_code=400, detail=f"Facebook Auth failed: {str(e)}")

@router.get("/facebook/accounts", response_model=List[AdAccountSchema])
async def get_facebook_accounts(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch available ad accounts from Facebook for the current user"""
    if not current_user.fb_access_token:
        raise HTTPException(status_code=401, detail="Facebook not connected")
    
    accounts = fb_service.get_managed_accounts(current_user.fb_access_token)
    return accounts

class LinkAccountsRequest(BaseModel):
    accounts: List[AdAccountSchema]

def run_etl_for_user(user_id: int, account_ids: List[int]):
    """
    Background task to run ETL for user's linked accounts.
    Uses user's Facebook access token to pull their ad data.
    """
    try:
        logger.info(f"Starting ETL sync for user {user_id}, accounts: {account_ids}")
        update_sync_status(user_id, "in_progress", progress_percent=10)

        # Run actual ETL with user tokens
        from backend.etl.main import ETLPipeline
        pipeline = ETLPipeline()
        pipeline.run_for_user(user_id, account_ids)

        mark_sync_completed(user_id)
        logger.info(f"ETL sync completed for user {user_id}")

    except Exception as e:
        logger.error(f"ETL sync failed for user {user_id}: {str(e)}", exc_info=True)
        mark_sync_failed(user_id, str(e))

@router.post("/facebook/accounts/link")
async def link_accounts(
    request: LinkAccountsRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Link selected ad accounts to the current user and start background sync"""
    repo = UserRepository(db)
    linked_accounts = []
    account_ids = []

    for account in request.accounts:
        # Convert string ID to int if needed (assuming DB uses BigInteger)
        try:
            acc_id = int(account.account_id.replace("act_", ""))
        except ValueError:
            # Handle potential non-numeric IDs cleanly
             acc_id = int(account.account_id) if account.account_id.isdigit() else 0

        if acc_id:
            link = repo.link_ad_account(
                user_id=current_user.id,
                account_id=acc_id,
                name=account.name,
                currency=account.currency
            )
            linked_accounts.append(link)
            account_ids.append(acc_id)

    # Update onboarding step
    repo.update_onboarding_step(current_user.id, 'complete_profile')

    # Initialize sync status
    init_sync_status(current_user.id)

    # Trigger background ETL sync
    background_tasks.add_task(run_etl_for_user, current_user.id, account_ids)

    logger.info(f"User {current_user.id} linked {len(linked_accounts)} accounts, ETL sync started in background")

    return {
        "message": f"Successfully linked {len(linked_accounts)} accounts",
        "linked_count": len(linked_accounts),
        "sync_status": "in_progress",
        "estimated_time_seconds": 30,
        "next_step": "complete_profile"
    }
@router.post("/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """DEPRECATED: Password-based registration is no longer supported"""
    raise HTTPException(
        status_code=410,
        detail="Password authentication is no longer supported. Please use magic link or OAuth (Facebook/Google) to sign in."
    )

@router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """DEPRECATED: Password-based login is no longer supported"""
    raise HTTPException(
        status_code=410,
        detail="Password authentication is no longer supported. Please use magic link or OAuth (Facebook/Google) to sign in."
    )

class UnifiedLoginRequest(BaseModel):
    email: EmailStr
    password: str
    confirm_create: bool = False

@router.post("/unified-login")
async def unified_login(request: UnifiedLoginRequest, db: Session = Depends(get_db)):
    """DEPRECATED: Unified password login is no longer supported"""
    raise HTTPException(
        status_code=410,
        detail="Password authentication is no longer supported. Please use magic link or OAuth (Facebook/Google) to sign in."
    )

@router.post("/dev-login")
async def dev_login(db: Session = Depends(get_db)):
    """TEMPORARY: Mock login for development without Facebook"""
    from backend.models.user_schema import User
    from datetime import datetime, timedelta
    # Try to find a dev user or create one
    user = db.query(User).filter(User.email == "dev@example.com").first()
    if not user:
        # Check if any user exists
        user = db.query(User).first()

    if not user:
        # Create a mock user if none exists
        repo = UserRepository(db)
        # Set expiration to 100 years in the future
        far_future = datetime.now() + timedelta(days=36500)
        user = repo.create_user(
            email="dev@example.com",
            fb_user_id="dev_id_" + str(uuid.uuid4())[:8],
            full_name="Dev User",
            access_token="mock_fb_token",
            expires_at=far_future
        )

    app_token = create_access_token(subject=user.id)
    return {"access_token": app_token, "token_type": "bearer"}

# ========== Magic Link Endpoints (Passwordless Auth) ==========

@router.post("/magic-link/request")
async def request_magic_link(request: MagicLinkRequest, db: Session = Depends(get_db)):
    """
    Request a magic link for passwordless authentication
    Sends an email with a one-time login link
    """
    try:
        from backend.config.base_config import settings

        magic_link_repo = MagicLinkRepository(db)
        user_repo = UserRepository(db)

        # Check if user exists
        user = user_repo.get_user_by_email(request.email)
        is_new_user = user is None

        # Generate magic link token
        token = magic_link_repo.create_token(request.email)

        # Build full magic link URL
        magic_link_url = f"{settings.FRONTEND_URL}/en/auth/verify?token={token}"

        # Send email
        email_sent = send_magic_link(
            email=request.email,
            magic_link=magic_link_url,
            is_new_user=is_new_user
        )

        if not email_sent:
            logger.error(f"Failed to send magic link email to {request.email}")
            raise HTTPException(
                status_code=500,
                detail="Failed to send email. Please try again."
            )

        logger.info(f"Magic link sent to {request.email} (new_user={is_new_user})")

        # Always return success (don't reveal if email exists for security)
        return {
            "success": True,
            "message": "Magic link sent! Check your email.",
            "email": request.email
        }

    except Exception as e:
        logger.error(f"Error sending magic link: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to send magic link. Please try again."
        )

@router.get("/magic-link/verify")
async def verify_magic_link(token: str, db: Session = Depends(get_db)):
    """
    Verify a magic link token and log the user in
    Creates a new user if they don't exist
    Returns JWT token and onboarding status
    """
    try:
        magic_link_repo = MagicLinkRepository(db)
        user_repo = UserRepository(db)

        # Verify token
        email = magic_link_repo.verify_token(token)

        if not email:
            logger.warning(f"Invalid or expired magic link token")
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired magic link. Please request a new one."
            )

        # Get or create user
        user = user_repo.get_user_by_email(email)

        if not user:
            # Create new user (passwordless)
            user = user_repo.create_user_with_email(email=email)
            logger.info(f"Created new user via magic link: {email}")

            # Audit log
            AuditService.log_event(
                db=db,
                user_id=str(user.id),
                event_type="USER_CREATED",
                description=f"User {email} created via magic link",
                metadata={"email": email, "method": "magic_link"}
            )
        else:
            logger.info(f"Existing user logged in via magic link: {email}")

            # Audit log
            AuditService.log_event(
                db=db,
                user_id=str(user.id),
                event_type="LOGIN_SUCCESS",
                description=f"User {email} logged in via magic link",
                metadata={"email": email, "method": "magic_link"}
            )

        # Mark email as verified
        user_repo.mark_email_verified(user.id)

        # Get onboarding status
        onboarding_status = user_repo.get_onboarding_status(user.id)

        # Create JWT access token
        access_token = create_access_token(subject=user.id)

        # Return token and onboarding status
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "onboarding_status": onboarding_status
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying magic link: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to verify magic link. Please try again."
        )

@router.get("/onboarding/status")
async def get_onboarding_status(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current user's onboarding progress"""
    user_repo = UserRepository(db)
    status = user_repo.get_onboarding_status(current_user.id)

    if not status:
        raise HTTPException(status_code=404, detail="User not found")

    return status

@router.post("/onboarding/complete")
async def complete_onboarding(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark the user's onboarding as complete (called after quiz)"""
    user_repo = UserRepository(db)
    user = user_repo.mark_onboarding_completed(current_user.id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    logger.info(f"User {current_user.email} completed onboarding")

    # Audit log
    AuditService.log_event(
        db=db,
        user_id=str(current_user.id),
        event_type="ONBOARDING_COMPLETED",
        description=f"User {current_user.email} completed onboarding",
        metadata={"email": current_user.email}
    )

    return {
        "success": True,
        "message": "Onboarding completed!",
        "onboarding_completed": True
    }

