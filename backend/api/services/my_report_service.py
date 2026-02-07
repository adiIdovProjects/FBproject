"""
My Report Service - Simple recommendations and report data for beginners.
Provides:
- Yesterday's key metrics
- 7-day chart data
- Simple rule-based recommendations (no AI)
- User report preferences management
"""

import logging
from datetime import date, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.models.user_schema import UserReportPreferences
from backend.api.repositories.metrics_repository import MetricsRepository
from backend.api.repositories.campaign_repository import CampaignRepository
from backend.api.repositories.creative_repository import CreativeRepository
from backend.api.repositories.timeseries_repository import TimeSeriesRepository
from backend.api.utils.calculations import MetricCalculator

logger = logging.getLogger(__name__)


class MyReportService:
    """Service for generating simple reports and recommendations."""

    def __init__(self, db: Session, user_id: int, account_ids: Optional[List[int]] = None):
        self.db = db
        self.user_id = user_id
        self.account_ids = account_ids
        self.metrics_repo = MetricsRepository(db)
        self.campaign_repo = CampaignRepository(db)
        self.creative_repo = CreativeRepository(db)
        self.timeseries_repo = TimeSeriesRepository(db)
        self.calculator = MetricCalculator()

    def get_user_preferences(self) -> Optional[UserReportPreferences]:
        """Get user's report preferences."""
        return self.db.query(UserReportPreferences).filter(
            UserReportPreferences.user_id == self.user_id
        ).first()

    def save_preferences(
        self,
        selected_metrics: List[str],
        chart_type: str,
        include_recommendations: bool,
        email_schedule: str
    ) -> UserReportPreferences:
        """Save or update user's report preferences."""
        prefs = self.get_user_preferences()

        if prefs:
            prefs.selected_metrics = selected_metrics
            prefs.chart_type = chart_type
            prefs.include_recommendations = include_recommendations
            prefs.email_schedule = email_schedule
        else:
            prefs = UserReportPreferences(
                user_id=self.user_id,
                selected_metrics=selected_metrics,
                chart_type=chart_type,
                include_recommendations=include_recommendations,
                email_schedule=email_schedule
            )
            self.db.add(prefs)

        self.db.commit()
        self.db.refresh(prefs)
        return prefs

    def get_yesterday_metrics(self) -> Dict[str, Any]:
        """Get key metrics for yesterday."""
        yesterday = date.today() - timedelta(days=1)

        raw_metrics = self.metrics_repo.get_aggregated_metrics(
            yesterday, yesterday, None, self.account_ids
        )

        spend = raw_metrics.get('spend', 0) or 0
        conversions = raw_metrics.get('conversions', 0) or 0
        clicks = raw_metrics.get('clicks', 0) or 0
        impressions = raw_metrics.get('impressions', 0) or 0
        conversion_value = raw_metrics.get('conversion_value', 0) or 0

        return {
            'date': str(yesterday),
            'spend': float(spend),
            'conversions': int(conversions),
            'clicks': int(clicks),
            'impressions': int(impressions),
            'cpa': self.calculator.cpa(spend, conversions),
            'ctr': self.calculator.ctr(clicks, impressions),
            'roas': self.calculator.roas(conversion_value, spend, conversions),
        }

    def get_chart_data(self, chart_type: str = 'spend') -> List[Dict[str, Any]]:
        """Get 7-day trend data for chart."""
        end_date = date.today() - timedelta(days=1)
        start_date = end_date - timedelta(days=6)

        time_series = self.timeseries_repo.get_time_series(
            start_date, end_date, 'day', None, self.account_ids
        )

        data = []
        for point in time_series:
            entry = {
                'date': str(point['date']),
                'value': float(point.get(chart_type, 0) or 0)
            }
            # For conversions, ensure it's an int
            if chart_type == 'conversions':
                entry['value'] = int(point.get('conversions', 0) or 0)
            data.append(entry)

        return data

    def get_budget_status(self) -> Dict[str, Any]:
        """Get current month budget status."""
        today = date.today()
        month_start = date(today.year, today.month, 1)

        # Calculate days info
        if today.month == 12:
            next_month = date(today.year + 1, 1, 1)
        else:
            next_month = date(today.year, today.month + 1, 1)
        days_in_month = (next_month - month_start).days
        days_passed = today.day

        # Get month-to-date spend
        raw_metrics = self.metrics_repo.get_aggregated_metrics(
            month_start, today, None, self.account_ids
        )

        spend = float(raw_metrics.get('spend', 0) or 0)

        # Project full month spend
        if days_passed > 0:
            projected_spend = (spend / days_passed) * days_in_month
        else:
            projected_spend = 0

        percent_used = (days_passed / days_in_month) * 100 if days_in_month > 0 else 0

        return {
            'month_to_date_spend': spend,
            'projected_spend': projected_spend,
            'days_passed': days_passed,
            'days_in_month': days_in_month,
            'percent_of_month': percent_used
        }

    def generate_recommendations(self, max_count: int = 2) -> List[Dict[str, str]]:
        """
        Generate simple recommendations based on 4 rules.
        Returns most relevant 1-2 recommendations.
        """
        recommendations = []

        end_date = date.today() - timedelta(days=1)
        start_date = end_date - timedelta(days=6)

        try:
            # Rule 1: Add more ads to working campaign
            rec = self._check_working_campaign(start_date, end_date)
            if rec:
                recommendations.append(rec)

            # Rule 2: Video vs Image performance
            rec = self._check_creative_format(start_date, end_date)
            if rec:
                recommendations.append(rec)

            # Rule 3: Budget reallocation
            rec = self._check_budget_reallocation(start_date, end_date)
            if rec:
                recommendations.append(rec)

            # Rule 4: Over/under spending
            rec = self._check_spending_pace()
            if rec:
                recommendations.append(rec)

        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")

        # Return top recommendations
        return recommendations[:max_count]

    def _check_working_campaign(self, start_date: date, end_date: date) -> Optional[Dict[str, str]]:
        """Rule 1: Find high-performing campaign with few ads."""
        try:
            # Get campaigns with good ROAS
            campaigns = self.campaign_repo.get_campaign_breakdown(
                start_date=start_date,
                end_date=end_date,
                sort_by='conversions',
                sort_direction='desc',
                limit=10,
                account_ids=self.account_ids
            )

            if not campaigns:
                return None

            # Calculate average ROAS
            total_roas = sum(
                self.calculator.roas(c['conversion_value'], c['spend'], c['conversions'])
                for c in campaigns if c['spend'] > 0
            )
            avg_roas = total_roas / len(campaigns) if campaigns else 0

            # Find campaign with ROAS > 20% above average and good spend
            for campaign in campaigns:
                campaign_roas = self.calculator.roas(
                    campaign['conversion_value'],
                    campaign['spend'],
                    campaign['conversions']
                )

                if campaign_roas and campaign_roas > avg_roas * 1.2 and campaign['spend'] >= 50:
                    return {
                        'type': 'add_ads',
                        'icon': 'rocket',
                        'message': f"Test another ad in '{campaign['campaign_name'][:30]}' - it's performing well",
                        'reason': f"This campaign has a ROAS of {campaign_roas:.1f}x, which is 20% better than your average. Adding more ads can help scale what's already working."
                    }

            return None
        except Exception as e:
            logger.warning(f"Error in working campaign check: {e}")
            return None

    def _check_creative_format(self, start_date: date, end_date: date) -> Optional[Dict[str, str]]:
        """Rule 2: Compare video vs image CTR."""
        try:
            # Get video creatives
            videos = self.creative_repo.get_creative_metrics(
                start_date=start_date,
                end_date=end_date,
                is_video=True,
                min_spend=10,
                account_ids=self.account_ids
            )

            # Get image creatives
            images = self.creative_repo.get_creative_metrics(
                start_date=start_date,
                end_date=end_date,
                is_video=False,
                min_spend=10,
                account_ids=self.account_ids
            )

            if not videos or not images:
                return None

            # Calculate average CTR for each
            video_clicks = sum(v['clicks'] for v in videos)
            video_impressions = sum(v['impressions'] for v in videos)
            video_ctr = (video_clicks / video_impressions * 100) if video_impressions > 0 else 0

            image_clicks = sum(i['clicks'] for i in images)
            image_impressions = sum(i['impressions'] for i in images)
            image_ctr = (image_clicks / image_impressions * 100) if image_impressions > 0 else 0

            if video_ctr > 0 and image_ctr > 0:
                if video_ctr > image_ctr * 1.2:
                    diff = int((video_ctr / image_ctr - 1) * 100)
                    return {
                        'type': 'creative_format',
                        'icon': 'video',
                        'message': f"Videos getting {diff}% more clicks than images",
                        'reason': f"Your videos have a {video_ctr:.2f}% click rate vs {image_ctr:.2f}% for images. Consider creating more video content to maximize engagement."
                    }
                elif image_ctr > video_ctr * 1.2:
                    diff = int((image_ctr / video_ctr - 1) * 100)
                    return {
                        'type': 'creative_format',
                        'icon': 'image',
                        'message': f"Images getting {diff}% more clicks than videos",
                        'reason': f"Your images have a {image_ctr:.2f}% click rate vs {video_ctr:.2f}% for videos. Your audience responds better to static images."
                    }

            return None
        except Exception as e:
            logger.warning(f"Error in creative format check: {e}")
            return None

    def _check_budget_reallocation(self, start_date: date, end_date: date) -> Optional[Dict[str, str]]:
        """Rule 3: Suggest moving budget from worst to best CPA campaign."""
        try:
            campaigns = self.campaign_repo.get_campaign_breakdown(
                start_date=start_date,
                end_date=end_date,
                sort_by='spend',
                sort_direction='desc',
                limit=20,
                account_ids=self.account_ids
            )

            # Filter campaigns with conversions and calculate CPA
            campaigns_with_cpa = []
            for c in campaigns:
                if c['conversions'] > 0 and c['spend'] >= 50:
                    cpa = self.calculator.cpa(c['spend'], c['conversions'])
                    if cpa and cpa > 0:
                        campaigns_with_cpa.append({
                            'name': c['campaign_name'],
                            'cpa': cpa
                        })

            if len(campaigns_with_cpa) < 2:
                return None

            # Calculate average CPA
            avg_cpa = sum(c['cpa'] for c in campaigns_with_cpa) / len(campaigns_with_cpa)

            # Find worst (>1.5x avg) and best (<0.7x avg)
            worst = None
            best = None

            for c in campaigns_with_cpa:
                if c['cpa'] > avg_cpa * 1.5:
                    if not worst or c['cpa'] > worst['cpa']:
                        worst = c
                if c['cpa'] < avg_cpa * 0.7:
                    if not best or c['cpa'] < best['cpa']:
                        best = c

            if worst and best:
                return {
                    'type': 'budget_move',
                    'icon': 'dollar',
                    'message': f"Increase spend in '{best['name'][:25]}' - it has the best CPA",
                    'reason': f"This campaign costs ${best['cpa']:.2f} per conversion vs ${worst['cpa']:.2f} for your worst. Moving budget here gets you more results for the same money."
                }

            return None
        except Exception as e:
            logger.warning(f"Error in budget reallocation check: {e}")
            return None

    def _check_spending_pace(self) -> Optional[Dict[str, str]]:
        """Rule 4: Check if on track with monthly spending."""
        try:
            budget_status = self.get_budget_status()

            days_passed = budget_status['days_passed']
            days_in_month = budget_status['days_in_month']

            if days_passed < 5 or days_in_month == 0:
                return None

            expected_percent = (days_passed / days_in_month) * 100
            actual_spend_rate = budget_status['percent_of_month']

            # Note: Without a budget goal, we can only check pacing
            # If spend is very low relative to time passed
            if actual_spend_rate < 70:
                return {
                    'type': 'underspend',
                    'icon': 'trending_up',
                    'message': "Increase spend on your winning campaigns",
                    'reason': f"You've used only {actual_spend_rate:.0f}% of your monthly budget with {days_in_month - days_passed} days left. Scaling your best campaigns can help reach more customers."
                }

            return None
        except Exception as e:
            logger.warning(f"Error in spending pace check: {e}")
            return None

    def get_report_preview(self, selected_metrics: List[str] = None) -> Dict[str, Any]:
        """Get full report preview data."""
        if selected_metrics is None:
            selected_metrics = ['spend', 'conversions', 'cpa']

        prefs = self.get_user_preferences()
        chart_type = prefs.chart_type if prefs else 'spend'
        include_recs = prefs.include_recommendations if prefs else True

        # Get yesterday's metrics
        metrics = self.get_yesterday_metrics()

        # Filter to selected metrics only
        filtered_metrics = {
            k: v for k, v in metrics.items()
            if k in selected_metrics or k == 'date'
        }

        # Get chart data if requested
        chart_data = None
        if chart_type and chart_type != 'none':
            chart_data = self.get_chart_data(chart_type)

        # Get recommendations if enabled
        recommendations = []
        if include_recs:
            recommendations = self.generate_recommendations(2)

        # Get budget status
        budget = self.get_budget_status()

        return {
            'date': metrics['date'],
            'metrics': filtered_metrics,
            'chart_type': chart_type,
            'chart_data': chart_data,
            'budget_status': budget,
            'recommendations': recommendations
        }
