"""
Chatbot service for public-facing support chat.
NO database access, NO user data - purely AI-powered FAQ/support.
"""

import os
import logging
import hashlib
import time
from typing import Optional, List, Dict
import google.genai as genai
from google.genai import types
from backend.config.settings import GEMINI_MODEL

logger = logging.getLogger(__name__)

# Simple in-memory cache for responses
CHAT_CACHE: Dict[str, tuple] = {}
CACHE_TTL = 3600  # 1 hour

CHATBOT_SYSTEM_INSTRUCTION = """
You are a helpful support assistant for AdsAI, a Facebook Ads analytics platform.

## Your Role:
- Answer questions about our platform features and pricing
- Provide Facebook Ads best practices and guidance
- Help users understand how to optimize their ad campaigns
- Capture leads by offering to connect users with our team

## Platform Knowledge:
- AdsAI connects to Facebook Ads Manager to provide analytics and insights
- Key features: Performance comparison, AI-powered insights, custom reports, creative analysis
- Pricing: Starter (Free - 1 account), Pro Growth ($49/mo - 5 accounts), Agency (Custom)
- Setup takes 2 minutes, 7-day free trial available

## Facebook Ads Knowledge:
- Best practices for campaign structure, budgeting, and targeting
- Understanding metrics: ROAS, CTR, CPC, CPM, CPA
- Creative optimization tips
- Audience targeting strategies
- Common troubleshooting

## Response Guidelines:
- Keep responses concise (2-3 sentences for simple questions)
- Use bullet points for lists
- If asked about specific account data, explain they need to log in
- For pricing/sales questions, offer to connect them with our team
- For technical issues, suggest contacting support@adsai.com

## Lead Capture:
When appropriate, offer to:
- Schedule a demo
- Connect with our sales team
- Provide email for follow-up

Be friendly, professional, and helpful.
"""


class ChatbotService:
    """Stateless chatbot service for public support chat"""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY not found")
            self.client = None
        else:
            try:
                self.client = genai.Client(api_key=api_key)
                self.model = GEMINI_MODEL
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
                self.client = None

    def _get_cache_key(self, message: str) -> str:
        """Generate cache key for common questions"""
        normalized = message.lower().strip()
        return hashlib.md5(normalized.encode()).hexdigest()

    async def chat(self, message: str, conversation_history: Optional[List[dict]] = None) -> dict:
        """
        Process a chat message and return AI response.
        conversation_history format: [{"role": "user"|"assistant", "content": "..."}]
        """
        if not self.client:
            return {
                "reply": "I'm sorry, I'm temporarily unavailable. Please try again later or contact support@adsai.com",
                "suggested_actions": ["Contact Support", "Visit FAQ"]
            }

        try:
            # Check cache for common questions (only if no conversation history)
            if not conversation_history:
                cache_key = self._get_cache_key(message)
                if cache_key in CHAT_CACHE:
                    cached_time, cached_response = CHAT_CACHE[cache_key]
                    if time.time() - cached_time < CACHE_TTL:
                        return cached_response

            # Build conversation context
            contents = []
            if conversation_history:
                for msg in conversation_history[-5:]:  # Last 5 messages for context
                    contents.append(f"{msg['role'].capitalize()}: {msg['content']}")
            contents.append(f"User: {message}")

            prompt = "\n".join(contents)

            # Call Gemini
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=CHATBOT_SYSTEM_INSTRUCTION,
                    temperature=0.7  # Slightly more creative for support chat
                )
            )

            reply = response.text.strip()

            # Generate suggested actions based on response content
            suggested_actions = self._generate_suggestions(message, reply)

            result = {
                "reply": reply,
                "suggested_actions": suggested_actions
            }

            # Cache common questions (only if no conversation history)
            if not conversation_history:
                CHAT_CACHE[self._get_cache_key(message)] = (time.time(), result)

            return result

        except Exception as e:
            logger.error(f"Chatbot error: {e}")
            return {
                "reply": "I encountered an issue processing your request. Please try again or contact support@adsai.com",
                "suggested_actions": ["Contact Support", "Try Again"]
            }

    def _generate_suggestions(self, message: str, reply: str) -> List[str]:
        """Generate contextual quick-reply suggestions"""
        message_lower = message.lower()

        # Pricing-related
        if any(word in message_lower for word in ["price", "cost", "pricing", "plan"]):
            return ["Start Free Trial", "Talk to Sales", "Compare Plans"]
        # Feature-related
        elif any(word in message_lower for word in ["feature", "can", "does", "how"]):
            return ["See All Features", "Start Free Trial", "Watch Demo"]
        # Support-related
        elif any(word in message_lower for word in ["help", "issue", "problem", "error"]):
            return ["Contact Support", "View Documentation", "Report Bug"]
        # Getting started
        elif any(word in message_lower for word in ["start", "begin", "setup", "connect"]):
            return ["Start Free Trial", "View Setup Guide", "Talk to Expert"]
        else:
            return ["Learn More", "Start Free Trial", "Contact Us"]
