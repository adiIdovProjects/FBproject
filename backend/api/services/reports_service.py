"""
Reports Service
Handles comparison report generation and data aggregation
"""

from datetime import date
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import logging

from backend.api.repositories.metrics_repository import MetricsRepository
from backend.api.services.comparison_service import ComparisonService
from backend.api.schemas.responses import (
    ReportsComparisonResponse,
    ComparisonItem,
    MetricsPeriod,
    ChangePercentage
)

logger = logging.getLogger(__name__)


class ReportsService:
    """Service for generating comparison reports"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = MetricsRepository(db)
        self.comparison_service = ComparisonService()

    def _calculate_metrics(self, raw_data: Dict[str, Any]) -> MetricsPeriod:
        """
        Calculate derived metrics from raw data.

        Args:
            raw_data: Raw metrics from database (spend, impressions, clicks, etc.)

        Returns:
            MetricsPeriod with all calculated metrics
        """
        spend = float(raw_data.get('spend', 0))
        impressions = int(raw_data.get('impressions', 0))
        clicks = int(raw_data.get('clicks', 0))
        conversions = int(raw_data.get('conversions', 0))
        conversion_value = float(raw_data.get('conversion_value', 0))

        # Calculate derived metrics
        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        cpc = (spend / clicks) if clicks > 0 else 0
        cpm = (spend / impressions * 1000) if impressions > 0 else 0
        roas = (conversion_value / spend) if spend > 0 else 0
        cpa = (spend / conversions) if conversions > 0 else 0

        return MetricsPeriod(
            spend=spend,
            impressions=impressions,
            clicks=clicks,
            ctr=round(ctr, 2),
            cpc=round(cpc, 2),
            cpm=round(cpm, 2),
            conversions=conversions,
            conversion_value=conversion_value,
            roas=round(roas, 2) if roas > 0 else None,
            cpa=round(cpa, 2)
        )

    def _calculate_changes(
        self,
        period1: MetricsPeriod,
        period2: MetricsPeriod
    ) -> tuple[ChangePercentage, Dict[str, float]]:
        """
        Calculate percentage and absolute changes between two periods.

        Args:
            period1: Period 1 metrics
            period2: Period 2 metrics

        Returns:
            Tuple of (ChangePercentage, absolute_changes_dict)
        """
        # Percentage changes
        change_pct = ChangePercentage(
            spend=self.comparison_service.calculate_change_percentage(period1.spend, period2.spend),
            impressions=self.comparison_service.calculate_change_percentage(period1.impressions, period2.impressions),
            clicks=self.comparison_service.calculate_change_percentage(period1.clicks, period2.clicks),
            ctr=self.comparison_service.calculate_change_percentage(period1.ctr, period2.ctr),
            cpc=self.comparison_service.calculate_change_percentage(period1.cpc, period2.cpc),
            cpm=self.comparison_service.calculate_change_percentage(period1.cpm, period2.cpm),
            conversions=self.comparison_service.calculate_change_percentage(period1.conversions, period2.conversions),
            conversion_value=self.comparison_service.calculate_change_percentage(period1.conversion_value, period2.conversion_value),
            roas=self.comparison_service.calculate_change_percentage(period1.roas or 0, period2.roas or 0),
            cpa=self.comparison_service.calculate_change_percentage(period1.cpa, period2.cpa)
        )

        # Absolute changes
        change_abs = {
            'spend': self.comparison_service.calculate_absolute_change(period1.spend, period2.spend),
            'impressions': self.comparison_service.calculate_absolute_change(period1.impressions, period2.impressions),
            'clicks': self.comparison_service.calculate_absolute_change(period1.clicks, period2.clicks),
            'ctr': self.comparison_service.calculate_absolute_change(period1.ctr, period2.ctr),
            'cpc': self.comparison_service.calculate_absolute_change(period1.cpc, period2.cpc),
            'cpm': self.comparison_service.calculate_absolute_change(period1.cpm, period2.cpm),
            'conversions': self.comparison_service.calculate_absolute_change(period1.conversions, period2.conversions),
            'conversion_value': self.comparison_service.calculate_absolute_change(period1.conversion_value, period2.conversion_value),
            'roas': self.comparison_service.calculate_absolute_change(period1.roas or 0, period2.roas or 0),
            'cpa': self.comparison_service.calculate_absolute_change(period1.cpa, period2.cpa)
        }

        return change_pct, change_abs

    def get_comparison_data(
        self,
        period1_start: date,
        period1_end: date,
        period2_start: Optional[date],
        period2_end: Optional[date],
        dimension: str = 'overview',
        breakdown: str = 'none',
        campaign_filter: Optional[str] = None,
        ad_set_filter: Optional[str] = None,
        ad_filter: Optional[str] = None
    ) -> ReportsComparisonResponse:
        """
        Get comparison data between two periods.

        Args:
            period1_start: Period 1 start date
            period1_end: Period 1 end date
            period2_start: Period 2 start date (optional)
            period2_end: Period 2 end date (optional)
            dimension: 'overview', 'campaign', or 'ad'
            breakdown: 'none', 'campaign_name', 'ad_set_name', 'ad_name', 'date', 'week', 'month'
            campaign_filter: Optional campaign name filter
            ad_set_filter: Optional ad set name filter
            ad_filter: Optional ad name filter

        Returns:
            ReportsComparisonResponse with comparison data
        """
        currency = self.repository.get_account_currency()

        # Use breakdown parameter instead of dimension
        if breakdown == 'none':
            return self._get_overview_comparison(
                period1_start, period1_end,
                period2_start, period2_end,
                currency
            )
        elif breakdown == 'campaign_name':
            return self._get_campaign_comparison(
                period1_start, period1_end,
                period2_start, period2_end,
                campaign_filter,
                currency
            )
        elif breakdown == 'ad_set_name':
            return self._get_adset_comparison(
                period1_start, period1_end,
                period2_start, period2_end,
                campaign_filter,
                ad_set_filter,
                currency
            )
        elif breakdown == 'ad_name':
            return self._get_ad_comparison(
                period1_start, period1_end,
                period2_start, period2_end,
                campaign_filter,
                ad_set_filter,
                ad_filter,
                currency
            )
        elif breakdown in ['date', 'week', 'month']:
            return self._get_time_breakdown(
                period1_start, period1_end,
                period2_start, period2_end,
                breakdown,
                campaign_filter,
                ad_set_filter,
                ad_filter,
                currency
            )
        else:
            raise ValueError(f"Invalid breakdown: {breakdown}")

    def _get_overview_comparison(
        self,
        period1_start: date,
        period1_end: date,
        period2_start: Optional[date],
        period2_end: Optional[date],
        currency: str
    ) -> ReportsComparisonResponse:
        """Get overview-level comparison"""
        # Fetch data for period 1
        period1_raw = self.repository.get_aggregated_metrics(period1_start, period1_end)
        period1_metrics = self._calculate_metrics(period1_raw)

        # Fetch period 2 data only if comparison is enabled
        if period2_start and period2_end:
            period2_raw = self.repository.get_aggregated_metrics(period2_start, period2_end)
            period2_metrics = self._calculate_metrics(period2_raw)
            change_pct, change_abs = self._calculate_changes(period1_metrics, period2_metrics)
        else:
            # No comparison - use zeros for period 2
            period2_metrics = MetricsPeriod(
                spend=0, impressions=0, clicks=0, ctr=0, cpc=0, cpm=0,
                conversions=0, conversion_value=0, roas=None, cpa=0
            )
            change_pct, change_abs = self._calculate_changes(period1_metrics, period2_metrics)

        # Create comparison item
        overview_item = ComparisonItem(
            id="overview",
            name="Overall Performance",
            period1=period1_metrics,
            period2=period2_metrics,
            change_pct=change_pct,
            change_abs=change_abs
        )

        return ReportsComparisonResponse(
            dimension="overview",
            period1_start=period1_start.isoformat(),
            period1_end=period1_end.isoformat(),
            period2_start=period2_start.isoformat() if period2_start else None,
            period2_end=period2_end.isoformat() if period2_end else None,
            overview=overview_item,
            items=[],
            currency=currency
        )

    def _get_campaign_comparison(
        self,
        period1_start: date,
        period1_end: date,
        period2_start: Optional[date],
        period2_end: Optional[date],
        campaign_filter: Optional[str],
        currency: str
    ) -> ReportsComparisonResponse:
        """Get campaign-level comparison"""
        # Fetch campaign breakdowns for both periods
        period1_campaigns = self.repository.get_campaign_breakdown(
            period1_start, period1_end, search_query=campaign_filter
        )

        # Only fetch period2 if comparison is enabled
        if period2_start and period2_end:
            period2_campaigns = self.repository.get_campaign_breakdown(
                period2_start, period2_end, search_query=campaign_filter
            )
        else:
            period2_campaigns = []

        # Create campaign lookup by ID for period 2
        period2_lookup = {c['campaign_id']: c for c in period2_campaigns}

        comparison_items = []

        for campaign1 in period1_campaigns:
            campaign_id = campaign1['campaign_id']
            campaign_name = campaign1['campaign_name']

            # Find matching campaign in period 2
            campaign2 = period2_lookup.get(campaign_id)
            if not campaign2:
                # Campaign didn't exist in period 2, use zero metrics
                campaign2 = {
                    'spend': 0, 'impressions': 0, 'clicks': 0,
                    'conversions': 0, 'conversion_value': 0
                }

            # Calculate metrics
            period1_metrics = self._calculate_metrics(campaign1)
            period2_metrics = self._calculate_metrics(campaign2)

            # Calculate changes
            change_pct, change_abs = self._calculate_changes(period1_metrics, period2_metrics)

            comparison_items.append(ComparisonItem(
                id=str(campaign_id),
                name=campaign_name,
                period1=period1_metrics,
                period2=period2_metrics,
                change_pct=change_pct,
                change_abs=change_abs
            ))

        return ReportsComparisonResponse(
            dimension="campaign",
            period1_start=period1_start.isoformat(),
            period1_end=period1_end.isoformat(),
            period2_start=period2_start.isoformat() if period2_start else None,
            period2_end=period2_end.isoformat() if period2_end else None,
            overview=None,
            items=comparison_items,
            currency=currency
        )

    def _get_adset_comparison(
        self,
        period1_start: date,
        period1_end: date,
        period2_start: Optional[date],
        period2_end: Optional[date],
        campaign_filter: Optional[str],
        adset_filter: Optional[str],
        currency: str
    ) -> ReportsComparisonResponse:
        """Get ad set-level comparison"""
        # Fetch adset breakdowns for both periods
        period1_adsets = self.repository.get_adset_breakdown(
            period1_start, period1_end,
            search_query=adset_filter
        )

        # Only fetch period2 if comparison is enabled
        if period2_start and period2_end:
            period2_adsets = self.repository.get_adset_breakdown(
                period2_start, period2_end,
                search_query=adset_filter
            )
        else:
            period2_adsets = []

        # Create adset lookup by ID for period 2
        period2_lookup = {adset['adset_id']: adset for adset in period2_adsets}

        comparison_items = []

        for adset1 in period1_adsets:
            adset_id = adset1['adset_id']
            adset_name = adset1['adset_name']

            # Find matching adset in period 2
            adset2 = period2_lookup.get(adset_id)
            if not adset2:
                # Ad set didn't exist in period 2, use zero metrics
                adset2 = {
                    'spend': 0, 'impressions': 0, 'clicks': 0,
                    'conversions': 0, 'conversion_value': 0
                }

            # Calculate metrics
            period1_metrics = self._calculate_metrics(adset1)
            period2_metrics = self._calculate_metrics(adset2)

            # Calculate changes
            change_pct, change_abs = self._calculate_changes(period1_metrics, period2_metrics)

            comparison_items.append(ComparisonItem(
                id=str(adset_id),
                name=adset_name,
                period1=period1_metrics,
                period2=period2_metrics,
                change_pct=change_pct,
                change_abs=change_abs
            ))

        return ReportsComparisonResponse(
            dimension="adset",
            period1_start=period1_start.isoformat(),
            period1_end=period1_end.isoformat(),
            period2_start=period2_start.isoformat() if period2_start else None,
            period2_end=period2_end.isoformat() if period2_end else None,
            overview=None,
            items=comparison_items,
            currency=currency
        )

    def _get_ad_comparison(
        self,
        period1_start: date,
        period1_end: date,
        period2_start: Optional[date],
        period2_end: Optional[date],
        campaign_filter: Optional[str],
        adset_filter: Optional[str],
        ad_filter: Optional[str],
        currency: str
    ) -> ReportsComparisonResponse:
        """Get ad-level comparison"""
        # Fetch ad breakdowns for both periods
        period1_ads = self.repository.get_ad_breakdown(
            period1_start, period1_end,
            search_query=ad_filter
        )

        # Only fetch period2 if comparison is enabled
        if period2_start and period2_end:
            period2_ads = self.repository.get_ad_breakdown(
                period2_start, period2_end,
                search_query=ad_filter
            )
        else:
            period2_ads = []

        # Create ad lookup by ID for period 2
        period2_lookup = {ad['ad_id']: ad for ad in period2_ads}

        comparison_items = []

        for ad1 in period1_ads:
            ad_id = ad1['ad_id']
            ad_name = ad1['ad_name']

            # Find matching ad in period 2
            ad2 = period2_lookup.get(ad_id)
            if not ad2:
                # Ad didn't exist in period 2, use zero metrics
                ad2 = {
                    'spend': 0, 'impressions': 0, 'clicks': 0,
                    'conversions': 0, 'conversion_value': 0
                }

            # Calculate metrics
            period1_metrics = self._calculate_metrics(ad1)
            period2_metrics = self._calculate_metrics(ad2)

            # Calculate changes
            change_pct, change_abs = self._calculate_changes(period1_metrics, period2_metrics)

            comparison_items.append(ComparisonItem(
                id=str(ad_id),
                name=ad_name,
                period1=period1_metrics,
                period2=period2_metrics,
                change_pct=change_pct,
                change_abs=change_abs
            ))

        return ReportsComparisonResponse(
            dimension="ad",
            period1_start=period1_start.isoformat(),
            period1_end=period1_end.isoformat(),
            period2_start=period2_start.isoformat() if period2_start else None,
            period2_end=period2_end.isoformat() if period2_end else None,
            overview=None,
            items=comparison_items,
            currency=currency
        )

    def _get_time_breakdown(
        self,
        period1_start: date,
        period1_end: date,
        period2_start: Optional[date],
        period2_end: Optional[date],
        breakdown_type: str,
        campaign_filter: Optional[str],
        ad_set_filter: Optional[str],
        ad_filter: Optional[str],
        currency: str
    ) -> ReportsComparisonResponse:
        """Get time-based breakdown (date/week/month)"""
        # Map breakdown_type to granularity
        granularity_map = {
            'date': 'day',
            'week': 'week',
            'month': 'month'
        }
        granularity = granularity_map.get(breakdown_type, 'day')

        # Fetch time-series data for period 1
        period1_timeseries = self.repository.get_time_series(
            start_date=period1_start,
            end_date=period1_end,
            granularity=granularity
        )

        # Only fetch period2 if comparison is enabled
        if period2_start and period2_end:
            period2_timeseries = self.repository.get_time_series(
                start_date=period2_start,
                end_date=period2_end,
                granularity=granularity
            )
        else:
            period2_timeseries = []

        # Create lookup by date for period 2
        period2_lookup = {item['date']: item for item in period2_timeseries}

        comparison_items = []

        for time_point1 in period1_timeseries:
            time_date = time_point1['date']

            # Find matching time point in period 2
            time_point2 = period2_lookup.get(time_date)
            if not time_point2:
                # No matching time point in period 2, use zero metrics
                time_point2 = {
                    'spend': 0, 'impressions': 0, 'clicks': 0,
                    'conversions': 0, 'conversion_value': 0
                }

            # Calculate metrics
            period1_metrics = self._calculate_metrics(time_point1)
            period2_metrics = self._calculate_metrics(time_point2)

            # Calculate changes
            change_pct, change_abs = self._calculate_changes(period1_metrics, period2_metrics)

            comparison_items.append(ComparisonItem(
                id=time_date,
                name=time_date,
                period1=period1_metrics,
                period2=period2_metrics,
                change_pct=change_pct,
                change_abs=change_abs
            ))

        return ReportsComparisonResponse(
            dimension=f"time_{breakdown_type}",
            period1_start=period1_start.isoformat(),
            period1_end=period1_end.isoformat(),
            period2_start=period2_start.isoformat() if period2_start else None,
            period2_end=period2_end.isoformat() if period2_end else None,
            overview=None,
            items=comparison_items,
            currency=currency
        )
