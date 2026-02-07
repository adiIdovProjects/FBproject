"""
Campaign InsightsService - AI-Powered Campaign Performance Analysis

Analyzes campaign performance, categorized them by strategy (Scale, Optimize, Pause),
and provides budget allocation recommendations using Gemini AI.
"""

import os
import json
import logging
import hashlib
import time
from datetime import date
from typing import Dict, Any, List, Optional
import google.genai as genai
from google.genai import types
from sqlalchemy.orm import Session

from backend.api.repositories.insights_repository import InsightsRepository
from backend.config.settings import GEMINI_MODEL
from backend.config.base_config import SUPPORTED_LANGUAGES
from backend.utils.cache_utils import TTLCache

logger = logging.getLogger(__name__)

# Campaign analysis cache with size limit
CAMPAIGN_CACHE = TTLCache(ttl_seconds=3600, max_size=100)

CAMPAIGN_ANALYSIS_PROMPT = """Analyze campaign performance for the period {start_date} to {end_date} and provide SHORT insights.
Respond in {target_lang}.

{no_roas_instruction}

Rules:
- Maximum 3-4 bullet points total
- Each insight MUST be on its own line with a line break between them
- Each bullet: 1 sentence with specific campaign names and numbers
- NO tables, NO long paragraphs
- Use simple language
- If CTR is very low (under 0.5%), mention it needs creative/targeting review
- If a campaign has spend but 0 conversions, flag it as needing review

Format (each on separate line):

🚀 **{top_performers_label}:** [1 sentence about best campaign]

⚠️ **{needs_attention_label}:** [1 sentence about struggling campaign - mention specific issue]

💡 **{action_label}:** [One specific action to take]
"""

# Translated labels for campaign analysis
CAMPAIGN_LABELS = {
    'en': {'top_performers': 'Top Performers', 'needs_attention': 'Needs Attention', 'action': 'Action'},
    'he': {'top_performers': 'ביצועים מובילים', 'needs_attention': 'דורש טיפול', 'action': 'פעולה'},
    'ar': {'top_performers': 'الأفضل أداءً', 'needs_attention': 'يحتاج اهتمام', 'action': 'إجراء'},
    'de': {'top_performers': 'Top-Performer', 'needs_attention': 'Braucht Aufmerksamkeit', 'action': 'Aktion'},
    'fr': {'top_performers': 'Meilleurs Performeurs', 'needs_attention': 'Nécessite Attention', 'action': 'Action'},
}


class CampaignInsightsService:
    """Service for AI-powered campaign performance analysis"""

    def __init__(self, db: Session, user_id: Optional[int] = None):
        self.db = db
        self.user_id = user_id
        self.repository = InsightsRepository(db)

        # Initialize Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY not found in environment")
            self.client = None
        else:
            try:
                self.client = genai.Client(api_key=api_key)
                self.model = GEMINI_MODEL
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
                self.client = None

    def _get_cache_key(
        self,
        start_date: date,
        end_date: date,
        account_ids: Optional[List[int]],
        locale: str = "en"
    ) -> str:
        """Generate cache key"""
        key_str = f"campaign_analysis:{start_date}:{end_date}:{account_ids}:{locale}"
        return hashlib.md5(key_str.encode()).hexdigest()

    def analyze_campaign_performance(
        self,
        start_date: date,
        end_date: date,
        account_ids: Optional[List[int]] = None,
        locale: str = "en"
    ) -> Dict[str, Any]:
        """
        Generate comprehensive campaign performance analysis.
        """
        if not self.client:
            return {
                'error': 'AI service unavailable',
                'message': 'GEMINI_API_KEY not configured',
                'data': None
            }

        try:
            # Check cache
            cache_key = self._get_cache_key(start_date, end_date, account_ids, locale)
            cached_response = CAMPAIGN_CACHE.get(cache_key)
            if cached_response:
                logger.info(f"Cache hit for campaign analysis")
                return cached_response

            # Fetch campaign data (reuse get_insights_data for efficiency or call repo directly)
            # We'll use get_insights_data to get the processed campaign list
            insights_data = self.repository.get_insights_data(
                start_date=start_date,
                end_date=end_date,
                page_context="campaigns",
                account_ids=account_ids
            )

            campaigns = insights_data.get('campaigns', [])

            if not campaigns:
                return {
                    'error': 'no_data',
                    'message': 'No campaign data found for this period',
                    'data': None
                }

            # Prepare context for Gemini
            # Simplify campaign data to reduce tokens
            simplified_campaigns = []
            for c in campaigns[:20]:  # Analyze top 20
                simplified_campaigns.append({
                    'name': c.get('campaign_name'),
                    'status': c.get('status'),
                    'spend': float(c.get('spend', 0)),
                    'impressions': int(c.get('impressions', 0)),
                    'clicks': int(c.get('clicks', 0)),
                    'ctr': float(c.get('ctr', 0)),
                    'cpc': float(c.get('cpc', 0)),
                    'conversions': int(c.get('conversions', 0)),
                    'cpa': float(c.get('cpa', 0)),
                    'roas': float(c.get('roas', 0))
                })

            context = {
                'analysis_period': f'{start_date} to {end_date}',
                'total_campaigns': len(simplified_campaigns),
                'campaigns': simplified_campaigns,
                'total_spend': sum(c['spend'] for c in simplified_campaigns),
                'account_context': insights_data.get('account_context', {})
            }

            context_json = json.dumps(context, indent=2, default=str, ensure_ascii=False)

            target_lang = SUPPORTED_LANGUAGES.get(locale, 'English')

            # Check if we have ROAS data
            has_roas = any(c.get('roas', 0) > 0 for c in simplified_campaigns)
            no_roas_instruction = ""
            if not has_roas:
                no_roas_instruction = "IMPORTANT: There is NO ROAS data. Do NOT mention ROAS. Focus on conversions, CPA, CTR instead."

            # Get translated labels
            labels = CAMPAIGN_LABELS.get(locale, CAMPAIGN_LABELS['en'])

            prompt = CAMPAIGN_ANALYSIS_PROMPT.format(
                target_lang=target_lang,
                no_roas_instruction=no_roas_instruction,
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat(),
                top_performers_label=labels['top_performers'],
                needs_attention_label=labels['needs_attention'],
                action_label=labels['action']
            ) + f"\n\nData Context:\n{context_json}"

            # Call Gemini
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2
                )
            )

            analysis_text = response.text.strip()

            # Categorize campaigns logically for frontend (fallback if AI parsing is hard)
            # We will just categorize by simple rules for the "Data" part, while AI gives the "Analysis" part
            scale_campaigns = sorted([c for c in campaigns if float(c.get('roas', 0)) > 2.0], key=lambda x: x.get('roas'), reverse=True)
            fix_campaigns = sorted([c for c in campaigns if float(c.get('roas', 0)) < 1.0 and float(c.get('spend', 0)) > 50], key=lambda x: x.get('spend'), reverse=True)
            
            result = {
                'analysis': analysis_text,
                'data': {
                    'total_analyzed': len(campaigns),
                    'scale_candidates': scale_campaigns[:5],
                    'fix_candidates': fix_campaigns[:5],
                    'all_campaigns': campaigns[:20]
                },
                'metadata': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'generated_at': date.today().isoformat()
                }
            }

            # Cache result
            CAMPAIGN_CACHE.set(cache_key, result)
            
            return result

        except Exception as e:
            logger.error(f"Error in campaign analysis: {e}")
            return {
                'error': 'analysis_failed',
                'message': f'Failed to generate campaign analysis: {str(e)}',
                'data': None
            }
