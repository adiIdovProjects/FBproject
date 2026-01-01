"""
AI API router.
"""

from fastapi import APIRouter, Depends, HTTPException, Body, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
import sys
import os

# Add paths for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from api.dependencies import get_db, get_current_user
from api.services.ai_service import AIService
from api.schemas.responses import AIQueryResponse

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
async def get_suggested_questions(db: Session = Depends(get_db)):
    """
    Get dynamic suggested questions based on data availability.
    """
    try:
        service = AIService(db)
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
    question: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    Query the AI Investigator about performance data.
    """
    try:
        service = AIService(db)
        return await service.query_data(question)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Query failed: {str(e)}")
