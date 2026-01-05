"""
Proactive Analysis Service - Auto-generates Daily & Weekly Insights

This service automatically generates AI-powered insights without being asked,
like a 24/7 CMO monitoring your ad account.
"""

import os
import json
import logging
from datetime import date, timedelta, datetime, timezone
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, func

import google.generativeai as genai
from google.generativeai import types

try:
    from backend.models.schema import DimInsightHistory
    from backend.config.settings import GEMINI_MODEL
except ModuleNotFoundError:
    from models.schema import DimInsightHistory
    from config.settings import GEMINI_MODEL

logger = logging.getLogger(__name__)


DAILY_INSIGHT_PROMPT = """You are a Performance Marketing Analyst providing daily performance updates.

Compare yesterday's performance vs the 7-day average before yesterday.

Performance Data:
{context}

Provide a concise daily update in markdown format (2-3 paragraphs max):

1. **Performance Summary**: Key changes in spend, CTR, ROAS, conversions vs 7-day avg
2. **Alert Level**: Determine if this is critical, warning, opportunity, or info based on changes >20%
3. **Action Items**: 1-2 specific recommendations if performance declined >15%

Be concise and actionable. Use bullet points for clarity.
"""

WEEKLY_INSIGHT_PROMPT = """You are a Senior Marketing Strategist providing weekly performance summaries.

Analyze the past week's performance and trends.

Performance Data:
{context}

Provide a comprehensive weekly summary in markdown format:

## Weekly Performance Summary

### Key Metrics
- Spend, ROAS, CTR, Conversions vs previous week

### Trends & Patterns
- Performance direction (improving/declining/stable)
- Best/worst performing days

### Strategic Recommendations
1-3 high-impact action items for next week

Be strategic and forward-looking.
"""


class ProactiveAnalysisService:
    """Service for auto-generating daily/weekly insights"""

    def __init__(self, db: Session):
        self.db = db

        # Initialize Gemini Client
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY not found in environment")
            self.client = None
        else:
            try:
                self.client = genai.Client(api_key=api_key)
                self.model = GEMINI_MODEL
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")
                self.client = None

    def generate_daily_insights(
        self,
        account_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate daily insights comparing yesterday vs 7-day average.

        Returns list of generated insights (may be multiple if anomalies detected).
        """
        if not self.client:
            logger.error("Gemini client not available - skipping daily insights")
            return []

        try:
            yesterday = date.today() - timedelta(days=1)
            week_ago = yesterday - timedelta(days=7)
            two_weeks_ago = yesterday - timedelta(days=14)

            # Get yesterday's metrics
            yesterday_metrics = self._get_daily_metrics(yesterday, yesterday, account_id)

            # Get 7-day average (excluding yesterday)
            week_metrics = self._get_daily_metrics(week_ago + timedelta(days=1), yesterday - timedelta(days=1), account_id)

            if not yesterday_metrics or not week_metrics:
                logger.info("No data available for daily insights")
                return []

            # Calculate changes
            changes = self._calculate_changes(yesterday_metrics, week_metrics)

            # Determine priority based on magnitude of changes
            priority = self._determine_priority(changes)

            # Prepare context for AI
            context = {
                'yesterday': yesterday.isoformat(),
                'yesterday_metrics': yesterday_metrics,
                'week_average': week_metrics,
                'changes': changes
            }

            context_json = json.dumps(context, indent=2, default=str)

            # Call Gemini
            config = types.GenerateContentConfig(
                system_instruction=DAILY_INSIGHT_PROMPT,
                temperature=0.3
            )

            response = self.client.models.generate_content(
                model=self.model,
                contents=[context_json],
                config=config
            )

            analysis_text = response.text.strip()

            # Store insight in database
            insight = DimInsightHistory(
                account_id=account_id,
                generated_at=datetime.now(timezone.utc),
                insight_type='daily',
                priority=priority,
                category='performance',
                title=f"Daily Performance Update - {yesterday.strftime('%B %d, %Y')}",
                message=analysis_text,
                data_json=context_json,
                is_read=False
            )

            self.db.add(insight)
            self.db.commit()

            logger.info(f"Generated daily insight (priority: {priority})")

            return [{
                'insight_id': insight.insight_id,
                'priority': priority,
                'title': insight.title,
                'message': analysis_text
            }]

        except Exception as e:
            logger.error(f"Error generating daily insights: {e}")
            self.db.rollback()
            return []

    def generate_weekly_insights(
        self,
        account_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate weekly insights summarizing the past 7 days.

        Should be run on Mondays to summarize the previous week.
        """
        if not self.client:
            logger.error("Gemini client not available - skipping weekly insights")
            return []

        try:
            # Get last 7 days
            end_date = date.today() - timedelta(days=1)
            start_date = end_date - timedelta(days=6)

            # Get previous week for comparison
            prev_end = start_date - timedelta(days=1)
            prev_start = prev_end - timedelta(days=6)

            # Get current week metrics
            current_week = self._get_daily_metrics(start_date, end_date, account_id)

            # Get previous week metrics
            previous_week = self._get_daily_metrics(prev_start, prev_end, account_id)

            if not current_week:
                logger.info("No data available for weekly insights")
                return []

            # Calculate week-over-week changes
            changes = self._calculate_changes(current_week, previous_week) if previous_week else {}

            # Determine priority
            priority = self._determine_priority(changes) if changes else 'info'

            # Prepare context
            context = {
                'week_start': start_date.isoformat(),
                'week_end': end_date.isoformat(),
                'current_week_metrics': current_week,
                'previous_week_metrics': previous_week,
                'week_over_week_changes': changes
            }

            context_json = json.dumps(context, indent=2, default=str)

            # Call Gemini
            config = types.GenerateContentConfig(
                system_instruction=WEEKLY_INSIGHT_PROMPT,
                temperature=0.3
            )

            response = self.client.models.generate_content(
                model=self.model,
                contents=[context_json],
                config=config
            )

            analysis_text = response.text.strip()

            # Store insight
            insight = DimInsightHistory(
                account_id=account_id,
                generated_at=datetime.now(timezone.utc),
                insight_type='weekly',
                priority=priority,
                category='performance',
                title=f"Weekly Summary - {start_date.strftime('%b %d')} to {end_date.strftime('%b %d')}",
                message=analysis_text,
                data_json=context_json,
                is_read=False
            )

            self.db.add(insight)
            self.db.commit()

            logger.info(f"Generated weekly insight (priority: {priority})")

            return [{
                'insight_id': insight.insight_id,
                'priority': priority,
                'title': insight.title,
                'message': analysis_text
            }]

        except Exception as e:
            logger.error(f"Error generating weekly insights: {e}")
            self.db.rollback()
            return []

    def _get_daily_metrics(
        self,
        start_date: date,
        end_date: date,
        account_id: Optional[int] = None
    ) -> Optional[Dict[str, float]]:
        """Get aggregated metrics for date range"""
        account_filter = "AND f.account_id = :account_id" if account_id else ""

        query = text(f"""
            SELECT
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                CASE WHEN SUM(f.impressions) > 0
                     THEN (SUM(f.clicks)::float / SUM(f.impressions)) * 100
                     ELSE 0 END as ctr,
                COALESCE(SUM(conv.action_count), 0) as conversions,
                CASE WHEN SUM(f.spend) > 0 AND SUM(f.purchases) > 0
                     THEN SUM(f.purchase_value) / SUM(f.spend)
                     ELSE 0 END as roas,
                CASE WHEN COALESCE(SUM(conv.action_count), 0) > 0
                     THEN SUM(f.spend) / COALESCE(SUM(conv.action_count), 0)
                     ELSE 0 END as cpa
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            LEFT JOIN (
                SELECT date_id, account_id, campaign_id, adset_id, ad_id, creative_id,
                       SUM(action_count) as action_count
                FROM fact_action_metrics fam
                JOIN dim_action_type dat ON fam.action_type_id = dat.action_type_id
                WHERE dat.is_conversion = TRUE
                GROUP BY 1, 2, 3, 4, 5, 6
            ) conv ON f.date_id = conv.date_id
                  AND f.account_id = conv.account_id
                  AND f.campaign_id = conv.campaign_id
                  AND f.adset_id = conv.adset_id
                  AND f.ad_id = conv.ad_id
                  AND f.creative_id = conv.creative_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {account_filter}
        """)

        params = {'start_date': start_date, 'end_date': end_date}
        if account_id:
            params['account_id'] = account_id

        result = self.db.execute(query, params).fetchone()

        if not result or result.spend == 0:
            return None

        return {
            'spend': float(result.spend or 0),
            'impressions': int(result.impressions or 0),
            'clicks': int(result.clicks or 0),
            'ctr': float(result.ctr or 0),
            'conversions': int(result.conversions or 0),
            'roas': float(result.roas or 0),
            'cpa': float(result.cpa or 0)
        }

    def _calculate_changes(
        self,
        current: Dict[str, float],
        previous: Dict[str, float]
    ) -> Dict[str, float]:
        """Calculate percentage changes between periods"""
        changes = {}

        for key in ['spend', 'ctr', 'conversions', 'roas']:
            if key in current and key in previous and previous[key] != 0:
                change_pct = ((current[key] - previous[key]) / previous[key]) * 100
                changes[f'{key}_change_pct'] = round(change_pct, 1)

        return changes

    def _determine_priority(self, changes: Dict[str, float]) -> str:
        """Determine priority level based on metric changes"""
        # Check for critical issues (>30% decline in key metrics)
        if changes.get('roas_change_pct', 0) < -30 or changes.get('conversions_change_pct', 0) < -30:
            return 'critical'

        # Check for warnings (20-30% decline)
        if changes.get('roas_change_pct', 0) < -20 or changes.get('conversions_change_pct', 0) < -20:
            return 'warning'

        # Check for opportunities (>20% improvement)
        if changes.get('roas_change_pct', 0) > 20 or changes.get('conversions_change_pct', 0) > 20:
            return 'opportunity'

        return 'info'

    def get_latest_insights(
        self,
        priority: Optional[str] = None,
        limit: int = 10,
        unread_only: bool = False,
        account_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve stored insights from database.

        Args:
            priority: Filter by priority ('critical', 'warning', 'opportunity', 'info')
            limit: Max number of insights to return
            unread_only: Only return unread insights
            account_id: Filter by account

        Returns:
            List of insights
        """
        query = self.db.query(DimInsightHistory)

        if account_id:
            query = query.filter(DimInsightHistory.account_id == account_id)

        if priority:
            query = query.filter(DimInsightHistory.priority == priority)

        if unread_only:
            query = query.filter(DimInsightHistory.is_read == False)

        results = query.order_by(DimInsightHistory.generated_at.desc()).limit(limit).all()

        return [
            {
                'insight_id': r.insight_id,
                'generated_at': r.generated_at.isoformat(),
                'insight_type': r.insight_type,
                'priority': r.priority,
                'category': r.category,
                'title': r.title,
                'message': r.message,
                'is_read': r.is_read
            }
            for r in results
        ]

    def mark_as_read(self, insight_id: int) -> bool:
        """Mark an insight as read"""
        try:
            insight = self.db.query(DimInsightHistory).filter(
                DimInsightHistory.insight_id == insight_id
            ).first()

            if insight:
                insight.is_read = True
                self.db.commit()
                return True

            return False

        except Exception as e:
            logger.error(f"Error marking insight as read: {e}")
            self.db.rollback()
            return False
