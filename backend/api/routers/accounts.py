"""
Accounts router - Account-level operations.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.api.dependencies import get_db, get_current_user
from backend.api.repositories.account_repository import AccountRepository
from backend.api.repositories.user_repository import UserRepository
from backend.api.schemas.requests import ConversionTypesResponse
from typing import Optional, List

router = APIRouter(prefix="/api/v1/accounts", tags=["accounts"])


def verify_account_access(account_id: str, user_id: int, db: Session) -> bool:
    """Helper function to verify user has access to account"""
    user_repo = UserRepository(db)
    user_account_ids = user_repo.get_user_account_ids(user_id)
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
    if not verify_account_access(account_id, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied to this account")

    account_repo = AccountRepository(db)
    result = account_repo.get_conversion_types(int(account_id))

    return result
