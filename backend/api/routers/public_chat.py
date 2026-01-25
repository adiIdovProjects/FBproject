"""
Public chatbot router - NO authentication required.
"""

import logging
import uuid
import time
from collections import defaultdict
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List

from backend.api.services.chatbot_service import ChatbotService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/public",
    tags=["public-chat"]
)

# Simple in-memory rate limiting (since slowapi is disabled)
RATE_LIMIT_STORE: dict = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 20  # requests per window


def check_rate_limit(client_ip: str) -> bool:
    """Check if client has exceeded rate limit"""
    now = time.time()
    # Clean old entries
    RATE_LIMIT_STORE[client_ip] = [
        t for t in RATE_LIMIT_STORE[client_ip]
        if now - t < RATE_LIMIT_WINDOW
    ]
    # Check limit
    if len(RATE_LIMIT_STORE[client_ip]) >= RATE_LIMIT_MAX:
        return False
    # Record request
    RATE_LIMIT_STORE[client_ip].append(now)
    return True


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    conversation_id: Optional[str] = None
    history: Optional[List[dict]] = None


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    suggested_actions: Optional[List[str]] = None


# Initialize service once
chatbot_service = ChatbotService()


@router.post("/chat", response_model=ChatResponse)
async def public_chat(request: Request, chat_request: ChatRequest):
    """
    Public chatbot endpoint - no authentication required.
    For FAQ, platform info, Facebook Ads guidance, and lead capture.
    """
    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait a moment.")

    try:
        # Generate or use existing conversation ID
        conversation_id = chat_request.conversation_id or str(uuid.uuid4())

        # Process message
        result = await chatbot_service.chat(
            message=chat_request.message,
            conversation_history=chat_request.history
        )

        return ChatResponse(
            reply=result["reply"],
            conversation_id=conversation_id,
            suggested_actions=result.get("suggested_actions")
        )
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Chat service temporarily unavailable")


@router.get("/chat/suggestions")
async def get_starter_suggestions():
    """Get initial conversation starter suggestions"""
    return {
        "suggestions": [
            "What is AdsAI?",
            "How much does it cost?",
            "How do I connect my Facebook Ads?",
            "What metrics can I track?",
            "How can I improve my ROAS?"
        ]
    }
