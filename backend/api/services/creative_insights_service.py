"""
Creative Insights Service - AI-Powered Creative Analysis

Analyzes creative performance patterns, themes, CTA effectiveness,
and ad fatigue using pattern detection and Gemini AI.
"""

import os
import json
import logging
import hashlib
import time
from datetime import date, timedelta
from typing import Dict, Any, List, Optional
import google.genai as genai
from google.genai import types
from sqlalchemy.orm import Session

from backend.api.repositories.creative_analysis_repository import CreativeAnalysisRepository
from backend.utils.creative_pattern_detector import CreativePatternDetector
from backend.config.settings import GEMINI_MODEL

logger = logging.getLogger(__name__)

# Creative analysis cache
CREATIVE_CACHE = {}
CACHE_TTL = 3600  # 1 hour

CREATIVE_ANALYSIS_PROMPT = """You are a Creative Strategy Expert and Performance Marketer specializing in Facebook Ads creative optimization.

Analyze the provided creative performance data and provide actionable insights on what's working and what needs to change.

## Analysis Framework:

### 1. Theme Performance Analysis
- Identify which creative themes drive best results (ROAS, CTR, conversions)
- Quantify performance differences between themes
- Explain WHY certain themes resonate better with the audience
- Recommend theme ratios for creative portfolio

### 2. CTA Effectiveness
- Rank CTAs by conversion performance
- Identify CTAs that get clicks but don't convert (high CTR, low ROAS)
- Recommend which CTAs to use more/less
- Suggest CTA testing opportunities

### 3. Creative Fatigue Detection
- Flag ads showing declining CTR over time
- Prioritize refreshes by business impact (high spend + fatigue = urgent)
- Recommend refresh strategies (new creative vs variations)
- Suggest refresh timing based on fatigue severity

### 4. Winning Creative Patterns
- Identify common characteristics of top performers
- Analyze copy length, tone, messaging angles
- Highlight what separates winners from losers
- Provide specific examples with creative IDs

### 5. Creative Testing Insights
- Identify gaps in creative testing (missing themes, CTAs)
- Recommend next creative tests based on data
- Prioritize tests by potential impact
- Suggest budget allocation for testing

## Response Format (Use Markdown):

### 🎨 Creative Performance Summary
Brief overview (2-3 sentences) of overall creative health and key findings.

### 📊 Theme Performance Breakdown

**Top Performing Themes:**
| Theme | ROAS | Creatives | Conversions | Recommendation |
|-------|------|-----------|-------------|----------------|

Explain why winning themes work and what to replicate.

**Underperforming Themes:**
List themes to reduce or eliminate with reasons.

### 🎯 CTA Analysis

**Most Effective CTAs:**
| CTA | Conversions | Avg ROAS | Usage | Recommendation |
|-----|-------------|----------|-------|----------------|

**CTA Recommendations:**
- Increase: [CTA types] - Why
- Decrease: [CTA types] - Why
- Test: [New CTA variations] - Expected impact

### ⚠️ Creative Fatigue Alerts

**Urgent Refreshes Needed:**
List creatives with >20% CTR decline, prioritized by spend:
- Creative #[ID]: [Title preview] - CTR down [X]% → Refresh NOW
- Action: [Specific recommendation]

**Monitor Closely:**
Creatives showing early signs of fatigue (10-20% decline)

### 💡 Winning Creative Patterns

Analyze common traits of top performers:
- Copy length: [finding]
- Messaging angle: [finding]
- Visual type: Video vs Image performance
- Hook strategies: What grabs attention

**Examples of Top Performers:**
- Creative #[ID]: "[Title]" - ROAS [X]x, [why it works]

### 🚀 Creative Strategy Recommendations

Provide 3-5 prioritized actions:

1. **High Priority**: [Action] → [Expected outcome]
2. **Medium Priority**: [Action] → [Expected outcome]
3. **Testing Opportunity**: [Action] → [Expected outcome]

### 📋 Creative Refresh Plan

Specific plan for next 7-14 days:
- Creatives to pause: [list with reasons]
- Creatives to refresh: [list with new angle suggestions]
- New creatives to test: [themes/concepts]
- Budget allocation: [how to shift spend]

## Professional Standards:
- Use specific numbers, percentages, and creative IDs
- Explain WHY patterns exist (audience psychology, market dynamics)
- Provide confidence levels based on sample size
- Prioritize recommendations by ROI impact
- Be direct about what's not working (no sugarcoating)
- Use emojis for visual clarity: ✅ working, ⚠️ warning, 🔴 failing, 💡 opportunity
"""


class CreativeInsightsService:
    """Service for AI-powered creative performance analysis"""

    def __init__(self, db: Session, user_id: Optional[int] = None):
        self.db = db
        self.user_id = user_id
        self.repository = CreativeAnalysisRepository(db)
        self.pattern_detector = CreativePatternDetector()

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

    def _get_user_account_ids(self) -> Optional[List[int]]:
        """Get account IDs for current user (for data filtering)"""
        if not self.user_id:
            return None
        from backend.api.repositories.user_repository import UserRepository
        user_repo = UserRepository(self.db)
        return user_repo.get_user_account_ids(self.user_id)

    def _get_cache_key(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int]
    ) -> str:
        """Generate cache key from parameters"""
        key_str = f"creative:{start_date}:{end_date}:{campaign_id}"
        return hashlib.md5(key_str.encode()).hexdigest()

    async def analyze_creative_patterns(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        account_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive creative performance analysis.

        Args:
            start_date: Start date for analysis
            end_date: End date for analysis
            campaign_id: Optional campaign filter
            account_ids: Optional account filter

        Returns:
            Dict with creative analysis and AI insights
        """
        if not self.client:
            return {
                'error': 'AI service unavailable',
                'message': 'GEMINI_API_KEY not configured',
                'data': None
            }

        try:
            # Check cache
            cache_key = self._get_cache_key(start_date, end_date, campaign_id)
            if cache_key in CREATIVE_CACHE:
                cached_time, cached_response = CREATIVE_CACHE[cache_key]
                if time.time() - cached_time < CACHE_TTL:
                    logger.info(f"Cache hit for creative analysis: {start_date} to {end_date}")
                    return cached_response
                else:
                    del CREATIVE_CACHE[cache_key]

            # Fetch creative performance data
            creatives = self.repository.get_creative_performance(
                start_date=start_date,
                end_date=end_date,
                campaign_id=campaign_id,
                account_ids=account_ids,
                min_impressions=1000
            )

            if not creatives:
                return {
                    'error': 'no_data',
                    'message': f'No creative data found for period {start_date} to {end_date}',
                    'data': None
                }

            # Analyze themes using pattern detector
            theme_performance = self.pattern_detector.analyze_theme_performance(creatives)

            # Get CTA effectiveness
            cta_performance = self.repository.get_cta_effectiveness(
                start_date=start_date,
                end_date=end_date,
                account_ids=account_ids,
                min_creatives=2
            )

            # Detect fatigued creatives
            fatigued_creatives = self.repository.get_fatigued_creatives(
                lookback_days=(end_date - start_date).days,
                fatigue_threshold=-20.0,
                min_impressions=5000
            )

            # Identify winning patterns
            winning_patterns = self.pattern_detector.identify_winning_patterns(
                creatives=creatives,
                min_roas=2.0,
                min_conversions=5
            )

            # Prepare context for Gemini
            context = {
                'analysis_period': f'{start_date} to {end_date}',
                'total_creatives': len(creatives),
                'theme_performance': theme_performance,
                'cta_performance': cta_performance,
                'fatigued_creatives': fatigued_creatives[:10],  # Top 10 most fatigued
                'winning_patterns': winning_patterns,
                'top_performers': creatives[:10],  # Top 10 by ROAS
                'campaign_filter': f'Campaign ID: {campaign_id}' if campaign_id else 'All campaigns'
            }

            context_json = json.dumps(context, indent=2, default=str)

            prompt = (
                f"Analyze this Facebook Ads creative performance data for {start_date} to {end_date}.\n\n"
                f"Creative Performance Data:\n{context_json}\n\n"
                "Provide comprehensive creative strategy insights including theme analysis, "
                "CTA recommendations, fatigue alerts, and winning patterns. "
                "Follow the response format specified in your instructions."
            )

            # Call Gemini
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2
                )
            )

            analysis_text = response.text.strip()

            # Prepare response
            result = {
                'analysis': analysis_text,
                'data': {
                    'total_creatives': len(creatives),
                    'theme_performance': theme_performance,
                    'cta_performance': cta_performance,
                    'fatigued_creatives_count': len(fatigued_creatives),
                    'fatigued_creatives': fatigued_creatives[:10],
                    'top_performers': creatives[:5],  # Top 5 for display
                    'winning_patterns': winning_patterns
                },
                'metadata': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'campaign_id': campaign_id,
                    'generated_at': date.today().isoformat()
                }
            }

            # Cache the result
            CREATIVE_CACHE[cache_key] = (time.time(), result)
            logger.info(f"Cached creative analysis for {start_date} to {end_date}")

            return result

        except Exception as e:
            logger.error(f"Error in creative pattern analysis: {e}")
            return {
                'error': 'analysis_failed',
                'message': f'Failed to generate creative analysis: {str(e)}',
                'data': None
            }

    async def get_creative_fatigue_report(
        self,
        lookback_days: int = 30
    ) -> Dict[str, Any]:
        """
        Generate focused ad fatigue report.

        Args:
            lookback_days: Days to analyze

        Returns:
            Fatigue report with refresh recommendations
        """
        try:
            fatigued = self.repository.get_fatigued_creatives(
                lookback_days=lookback_days,
                fatigue_threshold=-15.0,  # More sensitive threshold
                min_impressions=3000
            )

            if not fatigued:
                return {
                    'message': 'No fatigued creatives detected',
                    'fatigued_count': 0,
                    'data': []
                }

            # Categorize by severity
            critical = [c for c in fatigued if c['fatigue_pct'] <= -30]
            warning = [c for c in fatigued if -30 < c['fatigue_pct'] <= -20]
            monitor = [c for c in fatigued if -20 < c['fatigue_pct'] <= -15]

            return {
                'summary': {
                    'total_fatigued': len(fatigued),
                    'critical_count': len(critical),
                    'warning_count': len(warning),
                    'monitor_count': len(monitor)
                },
                'critical_refreshes': critical,
                'warning_refreshes': warning,
                'monitor_closely': monitor,
                'recommendations': self._generate_fatigue_recommendations(critical, warning)
            }

        except Exception as e:
            logger.error(f"Error generating fatigue report: {e}")
            return {
                'error': 'report_failed',
                'message': f'Failed to generate fatigue report: {str(e)}'
            }

    def _generate_fatigue_recommendations(
        self,
        critical: List[Dict],
        warning: List[Dict]
    ) -> List[str]:
        """Generate action items for fatigued creatives"""
        recommendations = []

        if critical:
            recommendations.append(
                f"🔴 URGENT: Pause or refresh {len(critical)} critically fatigued ads immediately "
                f"(CTR declined >30%)"
            )

        if warning:
            recommendations.append(
                f"⚠️ Plan refreshes for {len(warning)} ads showing significant fatigue "
                f"(CTR declined 20-30%)"
            )

        recommendations.extend([
            "💡 Create new ad variations with different hooks/angles",
            "🎨 Test new creative formats (if using images, try video and vice versa)",
            "📊 Review winning ads from historical analysis for inspiration"
        ])

        return recommendations
