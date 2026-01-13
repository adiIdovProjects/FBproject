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

logger = logging.getLogger(__name__)

# Campaign analysis cache
CAMPAIGN_CACHE = {}
CACHE_TTL = 3600  # 1 hour

CAMPAIGN_ANALYSIS_PROMPT = """You are a Senior Media Buyer and Performance Strategist.
Respond in {target_lang}.

Analyze the provided campaign performance data and provide a strategic breakdown.

## Analysis Framework:

### 1. Campaign Categorization (The "Stop, Start, Continue" framework)
- **Top Performers (SCALE)**: High ROAS/Low CPA campaigns that deserve more budget.
- **Stable Performers (MAINTAIN)**: Campaigns hitting targets but not exceeding them.
- **Underperformers (FIX/PAUSE)**: Campaigns burning budget with poor results.

### 2. Budget Allocation Strategy
- Identify where budget is being wasted.
- Recommend specific budget shifts (e.g., "Shift $50/day from Campaign A to Campaign B").
- Analyze budget utilization efficiency.

### 3. Structural Insights
- Identify account-level issues (too many campaigns, audience overlap risks).
- Recommend consolidation opportunities if seen.
- Check for "Learning Limited" issues based on conversion volume.

## Response Format (Use Markdown):

### 📊 Campaign Performance Matrix

**🚀 SCALE Categories (Top Performers):**
| Campaign | Spend | ROAS | CPA | Why Scale? |
|----------|-------|------|-----|------------|
(List 1-3 best campaigns)

**🛡️ MAINTAIN Categories (Stable):**
| Campaign | Spend | ROAS | Verdict |
|----------|-------|------|---------|
(List stable campaigns)

**⚠️ FIX/PAUSE Categories (Underperformers):**
| Campaign | Spend | CPA | Issue | Recommendation |
|----------|-------|-----|-------|----------------|
(List losing campaigns)

### 💰 Budget Allocation Recommendations

- **Move Budget:** [Specific Recommendation] -> [Expected Impact]
- **Cut Budget:** [Specific Recommendation] -> [Savings]
- **Efficiency Score:** [High/Medium/Low] - [Explanation]

### 💡 Strategic Observations

- **Account Structure:** [Comment on campaign count/granularity]
- **Funnel Balance:** [Comment on Top vs Bottom funnel split if inferable]
- **Key Action:** [One single most important action to take today]

## Professional Standards:
- Be ruthless with underperformers.
- Be specific with dollar amounts.
- Use emojis for visual clarity.
"""


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

    async def analyze_campaign_performance(
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
            if cache_key in CAMPAIGN_CACHE:
                cached_time, cached_response = CAMPAIGN_CACHE[cache_key]
                if time.time() - cached_time < CACHE_TTL:
                    logger.info(f"Cache hit for campaign analysis")
                    return cached_response
                else:
                    del CAMPAIGN_CACHE[cache_key]

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

            context_json = json.dumps(context, indent=2, default=str)

            # Map locale
            lang_map = {
                'en': 'English', 'he': 'Hebrew', 'fr': 'French',
                'de': 'German', 'es': 'Spanish', 'ar': 'Arabic'
            }
            target_lang = lang_map.get(locale, 'English')

            prompt = CAMPAIGN_ANALYSIS_PROMPT.format(
                target_lang=target_lang
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

            # Cache
            CAMPAIGN_CACHE[cache_key] = (time.time(), result)
            
            return result

        except Exception as e:
            logger.error(f"Error in campaign analysis: {e}")
            return {
                'error': 'analysis_failed',
                'message': f'Failed to generate campaign analysis: {str(e)}',
                'data': None
            }
