"""
Accounts router - Account-level operations including quiz responses.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.api.dependencies import get_db, get_current_user
from backend.api.repositories.account_repository import AccountRepository
from backend.api.repositories.user_repository import UserRepository
from backend.api.schemas.requests import AccountQuizRequest, ConversionTypesResponse, ShareAccountRequest
from backend.api.schemas.responses import AccountCollaboratorResponse
from typing import Optional, List

router = APIRouter(prefix="/api/v1/accounts", tags=["accounts"])


def verify_account_access(account_id: str, user_id: int, db: Session) -> bool:
    """Helper function to verify user has access to account"""
    user_repo = UserRepository(db)
    user_account_ids = user_repo.get_user_account_ids(user_id)
    # Convert account_id to int for comparison (Facebook account IDs are stored as BigInt)
    try:
        account_id_int = int(account_id)
        return account_id_int in user_account_ids
    except ValueError:
        return False


@router.get("/{account_id}/conversion-types", response_model=ConversionTypesResponse)
async def get_conversion_types(
    account_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of conversion types that have data for this account.
    Returns empty list if data is still syncing.
    """
    # Verify access
    if not verify_account_access(account_id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied to this account")

    account_repo = AccountRepository(db)
    result = account_repo.get_conversion_types(int(account_id))

    return result


@router.post("/{account_id}/quiz")
async def save_account_quiz(
    account_id: str,
    quiz_data: AccountQuizRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save account optimization quiz responses.
    Upserts (creates or updates) quiz data for the account.
    """
    # Verify access
    if not verify_account_access(account_id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied to this account")

    account_repo = AccountRepository(db)

    quiz_response = account_repo.save_account_quiz(
        account_id=int(account_id),
        primary_goal=quiz_data.primary_goal,
        primary_goal_other=quiz_data.primary_goal_other,
        primary_conversions=quiz_data.primary_conversions,
        industry=quiz_data.industry,
        optimization_priority=quiz_data.optimization_priority,
        business_description=quiz_data.business_description
    )

    return {
        "success": True,
        "message": "Quiz responses saved successfully",
        "account_id": account_id
    }


@router.get("/{account_id}/quiz")
async def get_account_quiz(
    account_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get account quiz responses.
    Returns null if quiz has not been completed.
    """
    # Verify access
    if not verify_account_access(account_id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied to this account")

    account_repo = AccountRepository(db)
    quiz_data = account_repo.get_account_quiz(int(account_id))

    if not quiz_data:
        return {"quiz_completed": False, "data": None}

    return {
        "quiz_completed": True,
        "data": quiz_data
    }


