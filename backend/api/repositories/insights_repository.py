"""
Insights Repository
Fetches data needed for insights generation by reusing MetricsRepository
"""

from sqlalchemy.orm import Session
from datetime import date
from typing import Dict, Any, List, Optional

from .metrics_repository import MetricsRepository


class InsightsRepository:
    """Repository for fetching data needed for insights generation"""

    def __init__(self, db: Session):
        self.db = db
        self.metrics_repo = MetricsRepository(db)

    def get_insights_data(
        self,
        start_date: date,
        end_date: date,
        page_context: str = "dashboard",
        prev_start_date: Optional[date] = None,
        prev_end_date: Optional[date] = None,
        campaign_filter: Optional[str] = None,
        breakdown_type: Optional[str] = None,
        breakdown_group_by: Optional[str] = None,
        account_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Fetch all data needed for insights generation.
        Reuses existing MetricsRepository methods.

        Args:
            start_date: Start date for analysis
            end_date: End date for analysis
            page_context: Context for insights (dashboard, campaigns, creatives)
            prev_start_date: Optional start date for previous period comparison
            prev_end_date: Optional end date for previous period comparison
            campaign_filter: Optional campaign name filter
            breakdown_type: Optional breakdown type (adset, platform, placement, age-gender, country)
            breakdown_group_by: Optional grouping for age-gender breakdown
            account_ids: Optional list of account IDs to filter by

        Returns:
            Dictionary with overview, prev_overview, campaigns, daily_trends, and breakdown data
        """
        # Get overview metrics (account-wide)
        overview = self.metrics_repo.get_aggregated_metrics(start_date, end_date, account_ids=account_ids)

        # Get previous overview metrics if dates provided
        prev_overview = None
        if prev_start_date and prev_end_date:
            prev_overview = self.metrics_repo.get_aggregated_metrics(prev_start_date, prev_end_date, account_ids=account_ids)

        # Get campaign breakdown (filtered if campaign_filter provided)
        campaigns = self.metrics_repo.get_campaign_breakdown(
            start_date=start_date,
            end_date=end_date,
            campaign_status=None,
            search_query=campaign_filter,  # Use campaign_filter as search_query
            sort_by='spend',
            sort_direction='desc',
            limit=20,  # Top 20 campaigns
            account_ids=account_ids
        )

        # Get daily trends for week-over-week comparisons
        daily_trends = self.metrics_repo.get_time_series(
            start_date=start_date,
            end_date=end_date,
            granularity='day',
            account_ids=account_ids
        )

        result = {
            'overview': overview,
            'prev_overview': prev_overview,
            'campaigns': campaigns,
            'daily_trends': daily_trends,
            'period': f"{start_date} to {end_date}",
            'prev_period': f"{prev_start_date} to {prev_end_date}" if prev_start_date else None,
            'context': page_context
        }

        # If breakdown_type is specified, fetch breakdown data
        if breakdown_type:
            result['breakdown_data'] = self._get_breakdown_data(
                start_date=start_date,
                end_date=end_date,
                breakdown_type=breakdown_type,
                group_by=breakdown_group_by,
                prev_start_date=prev_start_date,
                prev_end_date=prev_end_date,
                campaign_filter=campaign_filter,
                account_ids=account_ids
            )

        return result

    def _get_breakdown_data(
        self,
        start_date: date,
        end_date: date,
        breakdown_type: str,
        group_by: Optional[str] = None,
        prev_start_date: Optional[date] = None,
        prev_end_date: Optional[date] = None,
        campaign_filter: Optional[str] = None,
        account_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Fetch breakdown data for current and previous periods.

        Args:
            start_date: Current period start
            end_date: Current period end
            breakdown_type: Type of breakdown (adset, platform, placement, age-gender, country)
            group_by: For age-gender breakdown (age, gender, both)
            prev_start_date: Previous period start
            prev_end_date: Previous period end
            campaign_filter: Optional campaign filter
            account_ids: Optional list of account IDs to filter by

        Returns:
            Dictionary with current and previous breakdown data
        """
        # Map breakdown_type to repository methods
        breakdown_methods = {
            'adset': lambda sd, ed, cf, acc_ids: self.metrics_repo.get_campaign_breakdown(
                start_date=sd, end_date=ed, search_query=cf,
                sort_by='spend', sort_direction='desc', limit=50, account_ids=acc_ids
            ),
            'platform': lambda sd, ed, cf, acc_ids: [],  # TODO: Need platform breakdown method
            'placement': lambda sd, ed, cf, acc_ids: [],  # TODO: Need placement breakdown method
            'age-gender': lambda sd, ed, cf, acc_ids: [],  # TODO: Need demographic breakdown method
            'country': lambda sd, ed, cf, acc_ids: []  # TODO: Need country breakdown method
        }

        # For now, return campaigns for adset, empty for others
        # Full implementation would call appropriate breakdown methods from metrics_repository
        if breakdown_type == 'adset':
            current_breakdown = breakdown_methods[breakdown_type](
                start_date, end_date, campaign_filter, account_ids
            )
            prev_breakdown = []
            if prev_start_date and prev_end_date:
                prev_breakdown = breakdown_methods[breakdown_type](
                    prev_start_date, prev_end_date, campaign_filter, account_ids
                )
        else:
            # For other breakdown types, return placeholder
            # In production, these would call actual breakdown methods
            current_breakdown = []
            prev_breakdown = []

        return {
            'breakdown_type': breakdown_type,
            'current': current_breakdown,
            'previous': prev_breakdown
        }
