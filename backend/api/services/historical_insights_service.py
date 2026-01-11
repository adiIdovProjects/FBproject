"""
Historical Insights Service - Deep Trend Analysis

Provides long-term trend analysis, seasonality detection, and predictive insights
using historical data (30/60/90 days) integrated with Gemini AI.
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

from backend.api.repositories.historical_repository import HistoricalRepository
from backend.config.settings import GEMINI_MODEL

logger = logging.getLogger(__name__)

# Historical analysis cache
HISTORICAL_CACHE = {}
CACHE_TTL = 3600  # 1 hour

HISTORICAL_ANALYSIS_PROMPT = """You are a Senior Performance Marketing Analyst with expertise in trend forecasting and seasonality analysis.
Respond in {target_lang}.

Analyze the provided historical Facebook Ads data and provide deep, strategic insights.

## Analysis Framework:

### 1. Trend Direction Assessment
- Identify if performance is improving, declining, or stable
- Quantify the trend strength (weak, moderate, strong)
- Detect inflection points where trends changed direction
- Calculate momentum (is the trend accelerating or decelerating?)

### 2. Seasonality Patterns
- Identify day-of-week performance patterns
- Highlight best and worst performing days with specific percentages
- Detect weekly cyclical patterns (e.g., "Conversions spike 35% every Friday")
- Note confidence level based on sample size

### 3. Performance Consistency
- Measure volatility (high variance vs stable performance)
- Identify periods of consistent growth or decline
- Detect anomalies or one-off events
- Assess predictability of future performance

### 4. Early Warning Signals
- Spot metrics starting to decline before they become critical
- Identify leading indicators of performance issues
- Flag unusual patterns that need investigation
- Recommend preventive actions

### 5. Forecast & Predictions
- Based on historical trends, predict next week's expected performance
- Provide confidence ranges (best case, likely case, worst case)
- Identify key assumptions behind the forecast
- Suggest what to monitor to validate predictions

## Response Format (Use Markdown):

### 📊 Trend Summary
Brief overview (2-3 sentences) of overall performance trajectory and key findings.

### 📈 Week-over-Week Analysis
- Present weekly trend data in a clear table
- Highlight sustained trends (3+ weeks in same direction)
- Call out biggest changes and when they occurred

**Table Format:**
| Week | Conversions | WoW Change | ROAS | WoW Change | CTR | Status |
|------|-------------|------------|------|------------|-----|--------|

### 📅 Seasonality Findings
- Best performing day(s) of week with specific lift percentages
- Worst performing day(s) with specific drops
- Patterns and confidence level (e.g., "Based on 12 Fridays, high confidence")
- Actionable insight (e.g., "Increase budgets by 20% on Fridays")

### ⚠️ Early Warning Signals
List any concerning trends:
- Metrics showing decline (even if small)
- Volatility increases
- Emerging patterns that could become problems
- Recommended monitoring frequency

### 🔮 Next Week Forecast
Provide specific predictions:
- **Expected Conversions:** [range] (based on [trend])
- **Expected ROAS:** [range] (based on [trend])
- **Expected CTR:** [range] (based on [trend])
- **Confidence Level:** [High/Medium/Low] - explain why

### 💡 Strategic Recommendations
3-5 actionable recommendations based on historical patterns:
1. **[Action Category]**: Specific action → Expected outcome
2. **[Action Category]**: Specific action → Expected outcome
etc.

## Professional Standards:
- Use specific numbers and percentages (not vague descriptions)
- Explain WHY patterns exist when possible
- Acknowledge data limitations or low confidence
- Prioritize insights by business impact
- Use emojis for visual clarity: ✅ positive, ⚠️ warning, 🔴 critical, 💡 opportunity
- Show comparisons using arrows: ⬆️ improving, ⬇️ declining, ➡️ stable
"""


class HistoricalInsightsService:
    """Service for historical trend analysis with AI insights"""

    def __init__(self, db: Session, user_id: Optional[int] = None):
        self.db = db
        self.user_id = user_id
        self.repository = HistoricalRepository(db)

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
        lookback_days: int,
        campaign_id: Optional[int],
        account_ids: Optional[List[int]],
        locale: str = "en"
    ) -> str:
        """Generate cache key from parameters"""
        key_str = f"historical:{lookback_days}:{campaign_id}:{account_ids}:{locale}"
        return hashlib.md5(key_str.encode()).hexdigest()

    def _calculate_trend_metrics(self, weekly_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate trend statistics from weekly data"""
        if not weekly_data or len(weekly_data) < 2:
            return {
                'trend_direction': 'insufficient_data',
                'trend_strength': 0,
                'volatility': 0
            }

        # Calculate overall trend direction based on conversions
        conversions = [w['conversions'] for w in weekly_data if w.get('conversions', 0) > 0]

        if len(conversions) < 2:
            return {
                'trend_direction': 'insufficient_conversions',
                'trend_strength': 0,
                'volatility': 0
            }

        # Simple trend: compare first half vs second half
        mid = len(conversions) // 2
        first_half_avg = sum(conversions[:mid]) / mid if mid > 0 else 0
        second_half_avg = sum(conversions[mid:]) / (len(conversions) - mid) if len(conversions) > mid else 0

        if second_half_avg > first_half_avg * 1.15:
            trend_direction = 'improving'
            trend_strength = ((second_half_avg - first_half_avg) / first_half_avg * 100) if first_half_avg > 0 else 0
        elif second_half_avg < first_half_avg * 0.85:
            trend_direction = 'declining'
            trend_strength = ((first_half_avg - second_half_avg) / first_half_avg * 100) if first_half_avg > 0 else 0
        else:
            trend_direction = 'stable'
            trend_strength = 0

        # Calculate volatility (coefficient of variation)
        mean_conv = sum(conversions) / len(conversions) if conversions else 0
        if mean_conv > 0:
            variance = sum((x - mean_conv) ** 2 for x in conversions) / len(conversions)
            std_dev = variance ** 0.5
            volatility = (std_dev / mean_conv) * 100
        else:
            volatility = 0

        return {
            'trend_direction': trend_direction,
            'trend_strength': round(trend_strength, 2),
            'volatility': round(volatility, 2),
            'first_half_avg': round(first_half_avg, 2),
            'second_half_avg': round(second_half_avg, 2)
        }

    def _find_best_worst_days(self, seasonality_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Identify best and worst performing days from seasonality data"""
        if not seasonality_data:
            return {'best_days': [], 'worst_days': []}

        # Sort by conversion rate
        sorted_days = sorted(
            seasonality_data,
            key=lambda x: x.get('avg_daily_conversions', 0),
            reverse=True
        )

        best_days = sorted_days[:2] if len(sorted_days) >= 2 else sorted_days
        worst_days = sorted_days[-2:] if len(sorted_days) >= 2 else []

        return {
            'best_days': best_days,
            'worst_days': worst_days
        }

    async def analyze_historical_trends(
        self,
        lookback_days: int = 90,
        campaign_id: Optional[int] = None,
        account_ids: Optional[List[int]] = None,
        locale: str = "en"
    ) -> Dict[str, Any]:
        """
        Generate comprehensive historical trend analysis.

        Args:
            lookback_days: Number of days to analyze (30/60/90)
            campaign_id: Optional campaign filter
            account_ids: Optional account filter

        Returns:
            Dict with analysis results and AI insights
        """
        if not self.client:
            return {
                'error': 'AI service unavailable',
                'message': 'GEMINI_API_KEY not configured',
                'data': None
            }

        try:
            # Check cache
            cache_key = self._get_cache_key(lookback_days, campaign_id, account_ids, locale)
            if cache_key in HISTORICAL_CACHE:
                cached_time, cached_response = HISTORICAL_CACHE[cache_key]
                if time.time() - cached_time < CACHE_TTL:
                    logger.info(f"Cache hit for historical analysis: {lookback_days} days")
                    return cached_response
                else:
                    del HISTORICAL_CACHE[cache_key]

            # Fetch historical data
            weekly_trends = self.repository.get_weekly_trends(
                lookback_days=lookback_days,
                campaign_id=campaign_id,
                account_ids=account_ids
            )

            seasonality_data = self.repository.get_daily_seasonality(
                lookback_days=lookback_days,
                campaign_id=campaign_id,
                account_ids=account_ids
            )

            # Calculate trend metrics
            trend_metrics = self._calculate_trend_metrics(weekly_trends)
            day_insights = self._find_best_worst_days(seasonality_data)

            # Prepare context for Gemini
            context = {
                'analysis_period': f'Last {lookback_days} days',
                'weekly_trends': weekly_trends,
                'seasonality': seasonality_data,
                'trend_metrics': trend_metrics,
                'day_insights': day_insights,
                'campaign_filter': f'Campaign ID: {campaign_id}' if campaign_id else 'All campaigns'
            }

            context_json = json.dumps(context, indent=2)

            # Map locale to language name
            lang_map = {
                'en': 'English',
                'he': 'Hebrew',
                'fr': 'French',
                'de': 'German',
                'es': 'Spanish',
                'ar': 'Arabic'
            }
            target_lang = lang_map.get(locale, 'English')

            prompt = (
                f"Analyze this {lookback_days}-day historical Facebook Ads performance data.\n\n"
                f"Historical Data:\n{context_json}\n\n"
                f"Respond in {target_lang}.\n"
                "Provide deep trend analysis, seasonality insights, early warning signals, "
                "and forecast for next week. Follow the response format specified in your instructions."
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
                    'weekly_trends': weekly_trends,
                    'seasonality': seasonality_data,
                    'trend_metrics': trend_metrics,
                    'day_insights': day_insights
                },
                'metadata': {
                    'lookback_days': lookback_days,
                    'campaign_id': campaign_id,
                    'generated_at': date.today().isoformat()
                }
            }

            # Cache the result
            HISTORICAL_CACHE[cache_key] = (time.time(), result)
            logger.info(f"Cached historical analysis for {lookback_days} days")

            return result

        except Exception as e:
            logger.error(f"Error in historical trend analysis: {e}")
            return {
                'error': 'analysis_failed',
                'message': f'Failed to generate historical analysis: {str(e)}',
                'data': None
            }

    async def get_campaign_deep_dive(
        self,
        campaign_id: int,
        lookback_days: int = 90
    ) -> Dict[str, Any]:
        """
        Deep dive analysis for a specific campaign.

        Args:
            campaign_id: Campaign to analyze
            lookback_days: Historical period

        Returns:
            Campaign-specific trend analysis
        """
        if not self.client:
            return {
                'error': 'AI service unavailable',
                'message': 'GEMINI_API_KEY not configured'
            }

        try:
            # Fetch campaign-specific historical data
            campaign_history = self.repository.get_campaign_trend_history(
                campaign_id=campaign_id,
                lookback_days=lookback_days
            )

            if not campaign_history:
                return {
                    'error': 'no_data',
                    'message': f'No data found for campaign {campaign_id} in the last {lookback_days} days'
                }

            # Calculate performance changes
            initial_metrics = campaign_history[0]
            recent_metrics = campaign_history[-7:] if len(campaign_history) >= 7 else campaign_history

            avg_recent_ctr = sum(d['ctr'] for d in recent_metrics) / len(recent_metrics) if recent_metrics else 0
            avg_recent_roas = sum(d['roas'] for d in recent_metrics) / len(recent_metrics) if recent_metrics else 0

            context = {
                'campaign_id': campaign_id,
                'analysis_period': f'Last {lookback_days} days',
                'daily_performance': campaign_history,
                'initial_ctr': initial_metrics.get('ctr', 0),
                'current_avg_ctr': avg_recent_ctr,
                'initial_roas': initial_metrics.get('roas', 0),
                'current_avg_roas': avg_recent_roas
            }

            context_json = json.dumps(context, indent=2)

            prompt = (
                f"Analyze this campaign's {lookback_days}-day performance history in detail.\n\n"
                f"Campaign Data:\n{context_json}\n\n"
                "Focus on: 1) CTR trends and ad fatigue signals, 2) ROAS stability, "
                "3) Daily volatility patterns, 4) Specific recommendations for this campaign."
            )

            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2
                )
            )

            return {
                'campaign_id': campaign_id,
                'analysis': response.text.strip(),
                'data': campaign_history,
                'summary': {
                    'initial_ctr': round(initial_metrics.get('ctr', 0), 2),
                    'current_avg_ctr': round(avg_recent_ctr, 2),
                    'ctr_change_pct': round(((avg_recent_ctr - initial_metrics.get('ctr', 0)) / initial_metrics.get('ctr', 1)) * 100, 2) if initial_metrics.get('ctr', 0) > 0 else 0,
                    'initial_roas': round(initial_metrics.get('roas', 0), 2),
                    'current_avg_roas': round(avg_recent_roas, 2)
                }
            }

        except Exception as e:
            logger.error(f"Error in campaign deep dive: {e}")
            return {
                'error': 'analysis_failed',
                'message': f'Failed to analyze campaign: {str(e)}'
            }
