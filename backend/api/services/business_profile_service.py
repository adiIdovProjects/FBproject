"""
Business profile service - Website crawling, AI analysis, social page analysis.
Uses Google Gemini to extract structured business intelligence from websites and social pages.
"""

import os
import json
import logging
import httpx
from typing import Dict, Optional, List, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import google.genai as genai
from google.genai import types

from backend.api.repositories.business_profile_repository import BusinessProfileRepository
from backend.config.settings import GEMINI_MODEL

logger = logging.getLogger(__name__)


WEBSITE_ANALYSIS_PROMPT = """Analyze this website content and extract a structured business profile.
Return ONLY valid JSON with these fields:

{
  "business_type": "ecommerce|lead_gen|saas|local_business|agency|media|nonprofit|other",
  "business_model": "b2b|b2c|b2b2c",
  "target_audience": "Description of ideal customer profile (ICP) - who they sell to, demographics, psychographics",
  "tone_of_voice": "professional|casual|playful|authoritative|friendly|luxury|edgy|minimalist",
  "products_services": ["list", "of", "main", "products", "or", "services"],
  "geographic_focus": ["list", "of", "countries", "or", "regions"],
  "industry": "specific industry niche",
  "value_propositions": ["key", "value", "props"],
  "visual_style_notes": "Description of brand visual style - colors, imagery, mood",
  "business_description": "2-3 sentence summary of what this business does"
}

Be specific and practical. Focus on what matters for Facebook/Instagram advertising.
If you can't determine a field, use null.

Website content:
"""

SOCIAL_ANALYSIS_PROMPT = """Analyze these social media posts and extract patterns for advertising.
Return ONLY valid JSON:

{
  "content_themes": ["list", "of", "recurring", "themes"],
  "tone_of_voice": "the dominant tone across posts",
  "posting_style": "Description of how they communicate - formal/informal, emoji usage, hashtag patterns, content types",
  "engagement_patterns": "What type of content seems to get the most engagement based on the posts"
}

Posts:
"""


class BusinessProfileService:
    """Service for analyzing businesses via website and social media."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = BusinessProfileRepository(db)
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            self.client = genai.Client(api_key=api_key)
        else:
            self.client = None
            logger.warning("GEMINI_API_KEY not set - business analysis will not work")

    def save_profile(
        self,
        account_id: int,
        website_url: Optional[str] = None,
        business_description: Optional[str] = None
    ):
        """Save user input and return the profile."""
        return self.repo.create_or_update(
            account_id=account_id,
            website_url=website_url,
            business_description=business_description
        )

    def get_profile(self, account_id: int) -> Optional[Dict]:
        """Get the business profile as a dictionary."""
        profile = self.repo.get_by_account_id(account_id)
        if not profile:
            return None
        return self.repo.to_dict(profile)

    async def analyze_website(self, url: str) -> Dict:
        """Fetch website content and analyze with Gemini."""
        if not self.client:
            raise ValueError("Gemini API key not configured")

        # Fetch website HTML
        content = await self._fetch_website_content(url)
        if not content:
            raise ValueError(f"Could not fetch content from {url}")

        # Truncate to avoid token limits (keep first ~8000 chars of extracted text)
        content = content[:8000]

        # Analyze with Gemini
        try:
            response = self.client.models.generate_content(
                model=GEMINI_MODEL,
                contents=WEBSITE_ANALYSIS_PROMPT + content,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=2000,
                )
            )

            result_text = response.text.strip()
            # Clean markdown code fences if present
            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[1] if "\n" in result_text else result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            result_text = result_text.strip()

            return json.loads(result_text)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            return {"business_description": f"Website: {url}", "analysis_status": "failed"}
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            raise

    async def analyze_social_pages(
        self,
        posts: List[Dict[str, Any]]
    ) -> Dict:
        """Analyze Facebook/Instagram posts with Gemini."""
        if not self.client:
            raise ValueError("Gemini API key not configured")

        if not posts:
            return {}

        # Format posts for analysis
        posts_text = ""
        for i, post in enumerate(posts[:30]):
            message = post.get("message") or post.get("caption") or ""
            source = post.get("source", "facebook")
            posts_text += f"\n[{source.upper()} Post {i+1}]: {message}\n"

        if not posts_text.strip():
            return {}

        try:
            response = self.client.models.generate_content(
                model=GEMINI_MODEL,
                contents=SOCIAL_ANALYSIS_PROMPT + posts_text,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=1500,
                )
            )

            result_text = response.text.strip()
            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[1] if "\n" in result_text else result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            result_text = result_text.strip()

            return json.loads(result_text)

        except json.JSONDecodeError:
            logger.error("Failed to parse social analysis response")
            return {}
        except Exception as e:
            logger.error(f"Social analysis failed: {e}")
            return {}

    async def build_full_profile(
        self,
        account_id: int,
        website_url: Optional[str] = None,
        business_description: Optional[str] = None,
        fb_posts: Optional[List[Dict]] = None,
        ig_posts: Optional[List[Dict]] = None
    ):
        """
        Full orchestrator: analyze website + social pages, merge results, save to DB.
        Called as a background task.
        """
        self.repo.set_status(account_id, 'analyzing')

        try:
            # Step 1: Website analysis (if URL provided)
            website_data = {}
            if website_url:
                try:
                    website_data = await self.analyze_website(website_url)
                except Exception as e:
                    logger.error(f"Website analysis failed for {website_url}: {e}")
                    # Fall through - we can still use description and social

            # If no website data and we have a description, use it as-is
            if not website_data and business_description:
                website_data = {"business_description": business_description}

            # Save website analysis
            if website_data:
                self.repo.update_analysis(account_id, website_data)

            # Step 2: Social page analysis
            all_posts = []
            if fb_posts:
                all_posts.extend(fb_posts)
            if ig_posts:
                all_posts.extend(ig_posts)

            if all_posts:
                try:
                    social_data = await self.analyze_social_pages(all_posts)
                    if social_data:
                        self.repo.update_social_analysis(account_id, social_data)
                except Exception as e:
                    logger.error(f"Social analysis failed for account {account_id}: {e}")

            # Mark as completed
            self.repo.set_status(account_id, 'completed')
            logger.info(f"Business profile analysis completed for account {account_id}")

        except Exception as e:
            logger.error(f"Full profile analysis failed for account {account_id}: {e}")
            self.repo.set_status(account_id, 'failed')

    async def _fetch_website_content(self, url: str) -> Optional[str]:
        """Fetch and extract text content from a website."""
        try:
            # Ensure URL has protocol
            if not url.startswith(('http://', 'https://')):
                url = 'https://' + url

            async with httpx.AsyncClient(
                timeout=15.0,
                follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (compatible; BusinessAnalyzer/1.0)"}
            ) as client:
                response = await client.get(url)
                response.raise_for_status()
                html = response.text

            # Simple HTML text extraction (strip tags)
            import re
            # Remove script and style elements
            html = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
            # Remove HTML tags
            text = re.sub(r'<[^>]+>', ' ', html)
            # Clean whitespace
            text = re.sub(r'\s+', ' ', text).strip()

            return text

        except Exception as e:
            logger.error(f"Failed to fetch {url}: {e}")
            return None
