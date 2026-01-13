"""
AI API router.
"""

from fastapi import APIRouter, Depends, HTTPException, Body, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address


from backend.api.dependencies import get_db, get_current_user
from backend.api.services.ai_service import AIService
from backend.api.schemas.responses import AIQueryResponse

from backend.api.schemas.requests import AIQueryRequest

router = APIRouter(
    prefix="/api/v1/ai", 
    tags=["ai"],
    dependencies=[Depends(get_current_user)]
)
limiter = Limiter(key_func=get_remote_address)

@router.get(
    "/suggested-questions",
    summary="Get dynamically generated suggested questions",
    description="Returns contextual question suggestions based on available data"
)
async def get_suggested_questions(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dynamic suggested questions based on data availability.
    SECURITY: Only suggests questions based on current user's data.
    """
    try:
        service = AIService(db, user_id=current_user.id)
        return await service.get_suggested_questions()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")

@router.post(
    "/query",
    response_model=AIQueryResponse,
    summary="Query ads data using natural language",
    description="Uses Gemini to analyze performance data and answer questions."
)
@limiter.limit("10/minute")
async def query_ai(
    request: Request,
    query_request: AIQueryRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Query the AI Investigator about performance data.
    SECURITY: Only returns data from accounts the user has access to.
    """
    try:
        # SECURITY FIX: Pass user_id to service for account filtering
        service = AIService(db, user_id=current_user.id)
        # Extract account_id from context if available
        account_id = None
        if query_request.context and 'accountId' in query_request.context:
            account_id = str(query_request.context['accountId'])

        return await service.query_data(query_request.question, account_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Query failed: {str(e)}")
