"""
Recommendation service - AI-powered recommendations for audience targeting, ad copy, and creative direction.
Uses BusinessProfile data to provide personalized recommendations.
"""

import os
import json
import logging
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
import google.genai as genai
from google.genai import types

from backend.api.repositories.business_profile_repository import BusinessProfileRepository
from backend.config.settings import GEMINI_MODEL

logger = logging.getLogger(__name__)


AUDIENCE_RECOMMENDATIONS_PROMPT = """Based on this business profile, recommend Facebook/Instagram ad targeting parameters.

Business Profile:
{profile}

Provide JSON recommendations with this structure:
{{
  "interests": ["interest1", "interest2", "interest3"],
  "age_range": {{"min": 18, "max": 65}},
  "genders": ["all"|"male"|"female"],
  "countries": ["US", "UK", "CA"],
  "languages": ["en", "es"],
  "rationale": "Brief explanation of why these targets fit this business"
}}

Be specific and practical. Focus on Facebook interest targeting that actually exists.
"""

AD_COPY_RECOMMENDATIONS_PROMPT = """Generate ad copy recommendations for this business that match their brand tone.

Business Profile:
{profile}

Campaign Objective: {objective}

Provide 3 ad copy variants in JSON:
{{
  "variants": [
    {{
      "headline": "Compelling headline (max 40 chars)",
      "primary_text": "Main ad copy (1-2 sentences, conversational)",
      "description": "Brief description (max 30 chars)",
      "cta": "LEARN_MORE|SHOP_NOW|SIGN_UP|GET_QUOTE|etc."
    }}
  ],
  "tips": ["tip1", "tip2", "tip3"]
}}

Match the business's tone of voice: {tone}
"""

CREATIVE_DIRECTION_PROMPT = """Suggest creative direction for Facebook/Instagram ads for this business.

Business Profile:
{profile}

Provide recommendations in JSON:
{{
  "visual_style": "Description of recommended visual style",
  "content_angles": ["angle1", "angle2", "angle3"],
  "ad_formats": ["single_image", "video", "carousel"],
  "messaging_themes": ["theme1", "theme2"],
  "best_practices": ["tip1", "tip2", "tip3"]
}}

Be specific to their industry and audience.
"""


class RecommendationService:
    """Service for generating AI-powered advertising recommendations."""

    def __init__(self, db: Session):
        self.db = db
        self.profile_repo = BusinessProfileRepository(db)
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            self.client = genai.Client(api_key=api_key)
        else:
            self.client = None
            logger.warning("GEMINI_API_KEY not set - recommendations will not work")

    def get_audience_recommendations(self, account_id: int) -> Dict:
        """Generate audience targeting recommendations based on business profile."""
        if not self.client:
            return {"error": "AI service not configured"}

        profile = self.profile_repo.get_by_account_id(account_id)
        if not profile:
            return {"error": "No business profile found. Please complete business profile setup."}

        profile_summary = self._format_profile_for_prompt(profile)
        prompt = AUDIENCE_RECOMMENDATIONS_PROMPT.format(profile=profile_summary)

        try:
            response = self.client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=1500,
                )
            )

            result_text = self._clean_json_response(response.text)
            return json.loads(result_text)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse audience recommendations: {e}")
            return {"error": "Failed to generate recommendations"}
        except Exception as e:
            logger.error(f"Audience recommendation error: {e}")
            return {"error": str(e)}

    def get_ad_copy_recommendations(self, account_id: int, objective: str = "SALES") -> Dict:
        """Generate ad copy recommendations matching the brand's tone."""
        if not self.client:
            return {"error": "AI service not configured"}

        profile = self.profile_repo.get_by_account_id(account_id)
        if not profile:
            return {"error": "No business profile found"}

        profile_summary = self._format_profile_for_prompt(profile)
        tone = profile.tone_of_voice or "professional and friendly"

        prompt = AD_COPY_RECOMMENDATIONS_PROMPT.format(
            profile=profile_summary,
            objective=objective,
            tone=tone
        )

        try:
            response = self.client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.8,
                    max_output_tokens=2000,
                )
            )

            result_text = self._clean_json_response(response.text)
            return json.loads(result_text)

        except json.JSONDecodeError:
            logger.error("Failed to parse ad copy recommendations")
            return {"error": "Failed to generate ad copy"}
        except Exception as e:
            logger.error(f"Ad copy recommendation error: {e}")
            return {"error": str(e)}

    def get_creative_direction(self, account_id: int) -> Dict:
        """Generate creative direction recommendations."""
        if not self.client:
            return {"error": "AI service not configured"}

        profile = self.profile_repo.get_by_account_id(account_id)
        if not profile:
            return {"error": "No business profile found"}

        profile_summary = self._format_profile_for_prompt(profile)
        prompt = CREATIVE_DIRECTION_PROMPT.format(profile=profile_summary)

        try:
            response = self.client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=1500,
                )
            )

            result_text = self._clean_json_response(response.text)
            return json.loads(result_text)

        except json.JSONDecodeError:
            logger.error("Failed to parse creative direction")
            return {"error": "Failed to generate creative direction"}
        except Exception as e:
            logger.error(f"Creative direction error: {e}")
            return {"error": str(e)}

    def _format_profile_for_prompt(self, profile) -> str:
        """Format business profile into a readable summary for prompts."""
        parts = []
        if profile.business_description:
            parts.append(f"Business: {profile.business_description}")
        if profile.business_type:
            parts.append(f"Type: {profile.business_type}")
        if profile.business_model:
            parts.append(f"Model: {profile.business_model}")
        if profile.industry:
            parts.append(f"Industry: {profile.industry}")
        if profile.target_audience:
            parts.append(f"Target Audience: {profile.target_audience}")
        if profile.tone_of_voice:
            parts.append(f"Brand Tone: {profile.tone_of_voice}")
        if profile.geographic_focus:
            parts.append(f"Geographic Focus: {profile.geographic_focus}")
        if profile.products_services:
            parts.append(f"Products/Services: {profile.products_services}")
        if profile.value_propositions:
            parts.append(f"Value Props: {profile.value_propositions}")

        return "\n".join(parts) if parts else "No profile data available"

    def _clean_json_response(self, text: str) -> str:
        """Clean markdown code fences from Gemini response."""
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:]) if len(lines) > 1 else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
