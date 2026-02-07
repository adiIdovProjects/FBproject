import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Response, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from backend.api.dependencies import get_db, get_current_user
from backend.api.services.facebook_auth import FacebookAuthService
from backend.api.repositories.user_repository import UserRepository
from backend.api.services.audit_service import AuditService
from backend.api.utils.security import create_access_token, set_auth_cookie, clear_auth_cookie
from backend.api.routers.sync import init_sync_status, update_sync_status, mark_sync_completed, mark_sync_failed
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from backend.utils.logging_utils import get_logger
from backend.utils.encryption_utils import TokenEncryption

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
    page_id: Optional[str] = None  # Default page for this ad account
    page_name: Optional[str] = None  # Page name for display


def _sync_facebook_pages(db: Session, user, access_token: str):
    """
    Helper to sync Facebook pages for linked accounts.
    Returns the number of updated accounts.
    Only fetches pages for accounts the user has already linked (not all accounts).
    """
    try:
        from backend.utils.logging_utils import get_logger
        logger = get_logger(__name__)

        # Skip if user has no linked accounts
        if not user.ad_accounts or len(user.ad_accounts) == 0:
            return 0

        # Only fetch pages for accounts the user already has linked
        import requests
        from concurrent.futures import ThreadPoolExecutor, as_completed

        def fetch_page_for_account(account_id: int) -> dict:
            try:
                url = f"https://graph.facebook.com/v24.0/act_{account_id}/promote_pages"
                params = {"access_token": access_token, "fields": "id,name"}
                response = requests.get(url, params=params, timeout=10)
                if response.status_code == 200:
                    data = response.json().get("data", [])
                    if data:
                        return {"account_id": account_id, "page_id": data[0]["id"]}
            except Exception as e:
                logger.warning(f"Could not fetch page for account {account_id}: {e}")
            return {"account_id": account_id, "page_id": None}

        # Fetch pages in parallel only for linked accounts
        linked_account_ids = [acc.account_id for acc in user.ad_accounts]
        page_map = {}

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(fetch_page_for_account, acc_id): acc_id for acc_id in linked_account_ids}
            for future in as_completed(futures):
                result = future.result()
                if result["page_id"]:
                    page_map[result["account_id"]] = result["page_id"]

        updated_count = 0
        for user_acc in user.ad_accounts:
            account_id = user_acc.account_id
            if account_id in page_map:
                new_page_id = page_map[account_id]
                if new_page_id and user_acc.page_id != new_page_id:
                    user_acc.page_id = new_page_id
                    updated_count += 1

        if updated_count > 0:
            db.commit()
            logger.info(f"Auto-updated {updated_count} accounts with page_id during sync")

        return updated_count
    except Exception as e:
        logger.error(f"Failed to sync Facebook pages: {e}")
        return 0

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
                user.fb_access_token = TokenEncryption.encrypt_token(access_token)
                user.fb_token_expires_at = expires_at
                db.commit()

                # Automatically update page_id for all existing linked accounts
                updated_count = _sync_facebook_pages(db, user, access_token)

                # Audit log
                AuditService.log_event(
                    db=db,
                    user_id=str(user.id),
                    event_type="ACCOUNT_LINKED",
                    description=f"User {user.email} reconnected Facebook Account {fb_user.get('name')} - Updated {updated_count} accounts",
                    metadata={"fb_user_id": fb_user["id"], "updated_accounts": updated_count}
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
                    user.fb_access_token = TokenEncryption.encrypt_token(access_token)
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
                # FB ID exists - returning user OR consolidation needed
                fb_email = fb_user.get("email")

                # Check if FB email is different and not already stored
                if fb_email and fb_email != user.email and fb_email != user.secondary_email:
                    if not user.secondary_email:
                        # Slot available - add FB email as secondary (consolidation)
                        user.secondary_email = fb_email
                        db.commit()
                    else:
                        # Both slots full (2 emails max) - BLOCK 3rd email
                        from backend.config.base_config import settings
                        return RedirectResponse(
                            f"{settings.FRONTEND_URL}/en/login?error=fb_already_linked"
                        )

                repo.update_fb_token(user.id, access_token, expires_at)
                # Sync pages for existing user logging in
                _sync_facebook_pages(db, user, access_token)

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

        # Redirect back to frontend with token in URL
        # Frontend will call /api/v1/auth/session to set cookie via proxy
        from backend.config.base_config import settings
        from urllib.parse import urlparse

        # Security: Validate redirect URLs are to trusted domains only
        trusted_domains = [
            urlparse(settings.FRONTEND_URL).netloc,
            urlparse(settings.FACEBOOK_OAUTH_REDIRECT_URL).netloc
        ]

        if is_connect_flow:
            # Connect flow always goes to select-accounts to add/manage accounts
            redirect_url = f"{settings.FRONTEND_URL}/en/callback?redirect=select-accounts&token={app_token}"
        else:
            # Normal login redirect - go through callback
            redirect_url = f"{settings.FACEBOOK_OAUTH_REDIRECT_URL}?state={state}&token={app_token}"

        # Final validation: Ensure redirect URL is to a trusted domain
        parsed_redirect = urlparse(redirect_url)
        if parsed_redirect.netloc not in trusted_domains:
            logger.error(f"Attempted redirect to untrusted domain: {parsed_redirect.netloc}")
            raise HTTPException(status_code=400, detail="Invalid redirect URL")

        return RedirectResponse(redirect_url)
        
    except Exception as e:
        logger.error(f"Facebook Auth failed: {str(e)}", exc_info=True)
        from backend.config.base_config import settings
        from backend.utils.error_utils import sanitize_error_message

        # Sanitize error message for client (generic in production)
        safe_message = sanitize_error_message(e, "Authentication failed", "Facebook OAuth callback")

        if "connect" in state:
             return RedirectResponse(f"{settings.FRONTEND_URL}/settings?tab=accounts&error=connection_failed")
        raise HTTPException(status_code=400, detail=safe_message)

@router.get("/facebook/accounts", response_model=List[AdAccountSchema])
async def get_facebook_accounts(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch available ad accounts from Facebook for the current user"""
    if not current_user.fb_access_token:
        raise HTTPException(status_code=401, detail="Facebook not connected")

    try:
        accounts = fb_service.get_managed_accounts(current_user.decrypted_fb_token)
    except Exception as e:
        logger.error(f"Failed to fetch Facebook accounts: {e}")
        raise HTTPException(status_code=401, detail="Facebook token is invalid or expired. Please reconnect your Facebook account.")
    return accounts

@router.post("/facebook/reconnect")
async def reconnect_facebook(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Reconnect Facebook and update page_id for all existing linked accounts"""
    if not current_user.fb_access_token:
        raise HTTPException(status_code=401, detail="Facebook not connected")

    repo = UserRepository(db)

    # Fetch fresh account data from Facebook (including page_id)
    try:
        fb_accounts = fb_service.get_managed_accounts(current_user.decrypted_fb_token)
    except Exception as e:
        logger.error(f"Failed to reconnect Facebook accounts: {e}")
        raise HTTPException(status_code=401, detail="Facebook token is invalid or expired. Please reconnect your Facebook account.")

    # Create a map of account_id -> page_id
    fb_account_map = {
        int(acc["account_id"].replace("act_", "") if acc["account_id"].startswith("act_") else acc["account_id"]): acc["page_id"]
        for acc in fb_accounts
    }

    # Get user's currently linked accounts
    linked_accounts = current_user.ad_accounts
    updated_count = 0

    for user_acc in linked_accounts:
        account_id = user_acc.account_id
        # Update page_id if we found it in Facebook data
        if account_id in fb_account_map:
            new_page_id = fb_account_map[account_id]
            if new_page_id and user_acc.page_id != new_page_id:
                user_acc.page_id = new_page_id
                updated_count += 1

    db.commit()

    logger.info(f"User {current_user.id} reconnected Facebook, updated {updated_count} accounts with page_id")

    return {
        "success": True,
        "message": f"Updated {updated_count} accounts with Facebook Page info",
        "updated_count": updated_count
    }

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
                page_id=account.page_id,  # Store page_id
                page_name=account.page_name,  # Store page_name
                currency=account.currency
            )
            linked_accounts.append(link)
            account_ids.append(acc_id)

    # Update onboarding step
    repo.update_onboarding_step(current_user.id, 'business_profile')

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
        "next_step": "business_profile"
    }

class SetSessionRequest(BaseModel):
    token: str

@router.post("/session")
async def set_session(request: SetSessionRequest, response: Response, db: Session = Depends(get_db)):
    """
    Set auth cookie from a token. Used by frontend after OAuth redirect.
    Validates token before setting cookie for security.
    """
    try:
        # Validate the token first
        from jose import JWTError, jwt as jose_jwt
        from backend.config.base_config import settings

        payload = jose_jwt.decode(
            request.token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Verify user exists
        from backend.models.user_schema import User
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        # Set the auth cookie
        set_auth_cookie(response, request.token)

        # Set CSRF cookie so subsequent POST/PATCH requests have a valid token
        from backend.utils.csrf_utils import CSRFProtection
        csrf_token = CSRFProtection.generate_token()
        signed_token = CSRFProtection.create_signed_token(csrf_token)
        response.set_cookie(
            key="csrf_token",
            value=signed_token,
            httponly=False,
            secure=settings.ENVIRONMENT == "production",
            samesite="lax",
            max_age=86400
        )
        response.headers["X-CSRF-Token"] = csrf_token

        return {"success": True}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookie to log out user."""
    clear_auth_cookie(response)
    return {"success": True, "message": "Logged out successfully"}

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

