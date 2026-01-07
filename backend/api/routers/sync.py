"""
Sync Status Router
Tracks ETL synchronization status for users
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Optional
from datetime import datetime
from backend.api.dependencies import get_current_user
from backend.models.user_schema import User

router = APIRouter(prefix="/api/v1/sync", tags=["Sync"])

# In-memory sync status tracking
# In production, this should be moved to Redis for persistence across server restarts
SYNC_STATUS: Dict[int, Dict] = {}


@router.get("/status")
async def get_sync_status(
    current_user: User = Depends(get_current_user)
):
    """
    Get sync status for current user

    Returns sync status including:
    - status: 'in_progress', 'completed', 'failed', 'not_started'
    - progress_percent: 0-100
    - started_at: ISO timestamp
    - completed_at: ISO timestamp (if completed)
    - error: Error message (if failed)
    """
    user_id = current_user.id

    if user_id not in SYNC_STATUS:
        return {
            "status": "not_started",
            "progress_percent": 0,
            "started_at": None,
            "completed_at": None,
            "error": None
        }

    return SYNC_STATUS[user_id]


@router.post("/start")
async def start_sync(
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger sync for current user
    This is used for testing or manual sync triggers
    """
    user_id = current_user.id

    # Initialize sync status
    SYNC_STATUS[user_id] = {
        "status": "in_progress",
        "progress_percent": 0,
        "started_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "error": None
    }

    # TODO: Trigger actual ETL process here
    # For now, just return the status

    return {
        "message": "Sync started",
        "status": SYNC_STATUS[user_id]
    }


def update_sync_status(
    user_id: int,
    status: str,
    progress_percent: int = 0,
    error: Optional[str] = None
):
    """
    Helper function to update sync status
    Called by ETL process or BackgroundTask

    Args:
        user_id: User ID
        status: 'in_progress', 'completed', 'failed'
        progress_percent: 0-100
        error: Error message if status is 'failed'
    """
    if user_id not in SYNC_STATUS:
        SYNC_STATUS[user_id] = {
            "status": status,
            "progress_percent": progress_percent,
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": None,
            "error": error
        }
    else:
        SYNC_STATUS[user_id]["status"] = status
        SYNC_STATUS[user_id]["progress_percent"] = progress_percent

        if status == "completed" or status == "failed":
            SYNC_STATUS[user_id]["completed_at"] = datetime.utcnow().isoformat()

        if error:
            SYNC_STATUS[user_id]["error"] = error


def init_sync_status(user_id: int):
    """
    Initialize sync status when account linking starts
    """
    SYNC_STATUS[user_id] = {
        "status": "in_progress",
        "progress_percent": 0,
        "started_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "error": None
    }


def mark_sync_completed(user_id: int):
    """
    Mark sync as completed
    """
    update_sync_status(user_id, "completed", 100)


def mark_sync_failed(user_id: int, error: str):
    """
    Mark sync as failed with error message
    """
    update_sync_status(user_id, "failed", 0, error)
