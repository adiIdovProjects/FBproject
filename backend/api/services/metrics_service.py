"""
Business logic layer for metrics operations.

This module contains the service layer that orchestrates data retrieval,
calculations, and business logic for metrics endpoints.
"""

from datetime import date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session


from backend.api.repositories.metrics_repository import MetricsRepository
from backend.api.repositories.campaign_repository import CampaignRepository
from backend.api.repositories.adset_repository import AdSetRepository
from backend.api.repositories.ad_repository import AdRepository
from backend.api.repositories.creative_repository import CreativeRepository
from backend.api.repositories.breakdown_repository import BreakdownRepository
from backend.api.repositories.timeseries_repository import TimeSeriesRepository
from backend.api.utils.calculations import MetricCalculator
from backend.api.schemas.responses import (
    MetricsOverviewResponse,
    MetricsPeriod,
    ChangePercentage,
    CampaignMetrics,
    CampaignComparisonMetrics,
    TimeSeriesDataPoint,
    AgeGenderBreakdown,
    PlacementBreakdown,
    CountryBreakdown,
    CreativeMetrics,
    AdsetBreakdown
)
import logging

logger = logging.getLogger(__name__)


class MetricsService:
    """Service for metrics business logic"""

    def __init__(self, db: Session, user_id: Optional[int] = None):
        self.db = db
        self.user_id = user_id
        self.repository = MetricsRepository(db)
        self.campaign_repo = CampaignRepository(db)
        self.adset_repo = AdSetRepository(db)
        self.ad_repo = AdRepository(db)
        self.creative_repo = CreativeRepository(db)
        self.breakdown_repo = BreakdownRepository(db)
        self.timeseries_repo = TimeSeriesRepository(db)
        self.calculator = MetricCalculator()

    def _get_user_account_ids(self) -> Optional[List[int]]:
        """Get account IDs for current user (for data filtering)"""
        if not self.user_id:
            return None
        from backend.api.repositories.user_repository import UserRepository
        user_repo = UserRepository(self.db)
        return user_repo.get_user_account_ids(self.user_id)

    def _resolve_account_ids(self, requested_ids: Optional[List[int]]) -> List[int]:
        """
        Resolve and validate account IDs.
        
        Args:
            requested_ids: List of account IDs requested by the client
            
        Returns:
            List of validated account IDs allowed for the user
        """
        user_account_ids = self._get_user_account_ids() or []
        
        if requested_ids:
            # Intersection of requested and allowed
            filtered = [aid for aid in requested_ids if aid in user_account_ids]
            return filtered if filtered else []
        
        return user_account_ids

    def get_overview_metrics(
        self,
        start_date: date,
        end_date: date,
        compare_to_previous: bool = False,
        campaign_status: Optional[str] = None,
        account_ids: Optional[List[int]] = None
    ) -> MetricsOverviewResponse:
        """
        Calculate high-level KPIs with optional comparison.

        Args:
            start_date: Start date
            end_date: End date
            compare_to_previous: Include previous period comparison
            campaign_status: Optional status filter
            account_ids: Optional list of account IDs to filter by

        Returns:
            MetricsOverviewResponse with current and optional previous period
        """
        # Resolve account IDs
        filtered_account_ids = self._resolve_account_ids(account_ids)

        # Get current period metrics
        raw_metrics = self.repository.get_aggregated_metrics(
            start_date, end_date, campaign_status, filtered_account_ids
        )

        current_period = self._calculate_derived_metrics(raw_metrics)

        # Get previous period if requested
        previous_period = None
        change_percentage = None

        if compare_to_previous:
            days_diff = (end_date - start_date).days + 1
            previous_end = start_date - timedelta(days=1)
            previous_start = previous_end - timedelta(days=days_diff - 1)

            raw_previous = self.repository.get_aggregated_metrics(
                previous_start, previous_end, campaign_status, filtered_account_ids
            )

            previous_period = self._calculate_derived_metrics(raw_previous)
            change_percentage = self._calculate_period_changes(
                current_period, previous_period
            )

        # Get currency from database
        currency = self.repository.get_account_currency(filtered_account_ids)

        return MetricsOverviewResponse(
            current_period=current_period,
            previous_period=previous_period,
            change_percentage=change_percentage,
            currency=currency
        )

    def get_campaign_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None,
        sort_by: str = "spend",
        sort_direction: str = "desc",
        limit: int = 100,
        account_ids: Optional[List[int]] = None
    ) -> List[CampaignMetrics]:
        """
        Get campaign-level performance with calculated metrics.

        Args:
            start_date: Start date
            end_date: End date
            campaign_status: Optional list of statuses
            sort_by: Metric to sort by
            sort_direction: asc or desc
            limit: Maximum number of results
            account_ids: Optional list of account IDs to filter by

        Returns:
            List of CampaignMetrics
        """
        # Resolve account IDs
        filtered_account_ids = self._resolve_account_ids(account_ids)

        campaigns = self.campaign_repo.get_campaign_breakdown(
            start_date=start_date,
            end_date=end_date,
            campaign_status=campaign_status,
            search_query=search_query,
            sort_by=sort_by,
            sort_direction=sort_direction,
            limit=limit,
            account_ids=filtered_account_ids
        )

        # Calculate derived metrics for each campaign
        campaign_metrics = []
        for campaign in campaigns:
            metrics = CampaignMetrics(
                campaign_id=campaign['campaign_id'],
                campaign_name=campaign['campaign_name'],
                campaign_status=campaign['campaign_status'],
                spend=campaign['spend'],
                impressions=campaign['impressions'],
                clicks=campaign['clicks'],
                ctr=self.calculator.ctr(campaign['clicks'], campaign['impressions']),
                cpc=self.calculator.cpc(campaign['spend'], campaign['clicks']),
                cpm=self.calculator.cpm(campaign['spend'], campaign['impressions']),
                conversions=campaign['conversions'],
                conversion_value=campaign['conversion_value'],
                purchases=campaign['purchases'],
                purchase_value=campaign['purchase_value'],
                roas=self.calculator.roas(campaign['conversion_value'], campaign['spend'], campaign['conversions']),
                cpa=self.calculator.cpa(campaign['spend'], campaign['conversions'])
            )
            campaign_metrics.append(metrics)

        return campaign_metrics

    def get_campaign_comparison(
        self,
        start_date: date,
        end_date: date,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None,
        sort_by: str = "spend",
        sort_direction: str = "desc",
        limit: int = 100,
        account_ids: Optional[List[int]] = None
    ) -> List[CampaignComparisonMetrics]:
        """
        Get campaign-level performance with period comparison.

        Args:
            account_ids: Optional list of account IDs to filter by
        """
        # Resolve account IDs
        filtered_account_ids = self._resolve_account_ids(account_ids)

        # Get current period campaigns (as objects)
        current_campaigns = self.get_campaign_breakdown(
            start_date, end_date, campaign_status, search_query, sort_by, sort_direction, limit, filtered_account_ids
        )

        # Calculate previous period
        try:
            days_diff = (end_date - start_date).days + 1
            previous_end = start_date - timedelta(days=1)
            previous_start = previous_end - timedelta(days=days_diff - 1)
            
            # Additional safety check for min year
            if previous_start.year < 1 or previous_end.year < 1:
                raise OverflowError("Date underflow")

            # Get previous period campaigns (as dicts for lookup)
            previous_campaigns_raw = self.campaign_repo.get_campaign_breakdown(
                start_date=previous_start,
                end_date=previous_end,
                campaign_status=campaign_status,
                search_query=search_query,
                sort_by=sort_by,
                sort_direction=sort_direction,
                limit=1000,
                account_ids=filtered_account_ids
            )
        except (OverflowError, ValueError):
            logger.warning(f"Could not calculate previous period for {start_date} to {end_date}")
            previous_campaigns_raw = []
        
        # Map previous campaigns for easy lookup
        previous_map = {c['campaign_id']: c for c in previous_campaigns_raw}

        comparison_results = []
        for current in current_campaigns:
            prev = previous_map.get(current.campaign_id)
            
            # Calculate previous derived metrics if exists
            prev_metrics = None
            if prev:
                prev_metrics = {
                    'spend': prev['spend'],
                    'conversions': prev['conversions'],
                    'conversion_value': prev['conversion_value'],
                    'purchases': prev['purchases'],
                    'purchase_value': prev['purchase_value'],
                    'roas': self.calculator.roas(prev['conversion_value'], prev['spend'], prev['conversions']),
                    'cpa': self.calculator.cpa(prev['spend'], prev['conversions'])
                }

            # Build comparison object
            comparison = CampaignComparisonMetrics(
                **current.model_dump(),
                previous_spend=prev_metrics['spend'] if prev_metrics else None,
                previous_conversions=prev_metrics['conversions'] if prev_metrics else None,
                previous_conversion_value=prev_metrics['conversion_value'] if prev_metrics else None,
                previous_roas=prev_metrics['roas'] if prev_metrics else None,
                previous_cpa=prev_metrics['cpa'] if prev_metrics else None,
                spend_change_pct=self.calculator.change_percentage(current.spend, prev_metrics['spend']) if prev_metrics else None,
                conversions_change_pct=self.calculator.change_percentage(current.conversions, prev_metrics['conversions']) if prev_metrics else None,
                roas_change_pct=self.calculator.change_percentage(current.roas, prev_metrics['roas']) if prev_metrics else None,
                cpa_change_pct=self.calculator.change_percentage(current.cpa, prev_metrics['cpa']) if prev_metrics else None
            )
            comparison_results.append(comparison)

        return comparison_results

    def get_time_series(
        self,
        start_date: date,
        end_date: date,
        granularity: str = "day",
        metrics: List[str] = None,
        campaign_id: Optional[int] = None,
        account_ids: Optional[List[int]] = None
    ) -> List[TimeSeriesDataPoint]:
        """
        Get time series data with calculated metrics.

        Args:
            start_date: Start date
            end_date: End date
            granularity: day, week, or month
            metrics: List of metrics to include (optional, returns all)
            campaign_id: Optional campaign filter
            account_ids: Optional list of account IDs to filter by

        Returns:
            List of TimeSeriesDataPoint
        """
        # Resolve account IDs
        filtered_account_ids = self._resolve_account_ids(account_ids)

        time_series = self.timeseries_repo.get_time_series(
            start_date, end_date, granularity, campaign_id, filtered_account_ids
        )

        # Calculate derived metrics for each data point
        data_points = []
        for point in time_series:
            data_point = TimeSeriesDataPoint(
                date=str(point['date']),
                spend=point['spend'],
                clicks=point['clicks'],
                impressions=point['impressions'],
                ctr=self.calculator.ctr(point['clicks'], point['impressions']),
                cpc=self.calculator.cpc(point['spend'], point['clicks']),
                cpm=self.calculator.cpm(point['spend'], point['impressions']),
                conversions=point['conversions'],
                roas=self.calculator.roas(point['conversion_value'], point['spend'], point['conversions'])
            )
            data_points.append(data_point)

        return data_points

    def get_age_gender_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        group_by: str = 'both',
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None,
        account_ids: Optional[List[int]] = None
    ) -> List[AgeGenderBreakdown]:
        """
        Get demographic breakdown with calculated metrics.

        Args:
            start_date: Start date
            end_date: End date
            campaign_id: Optional campaign filter
            group_by: 'age', 'gender', or 'both'
            account_ids: Optional list of account IDs

        Returns:
            List of AgeGenderBreakdown
        """
        # Resolve account IDs
        filtered_account_ids = self._resolve_account_ids(account_ids)

        breakdowns = self.breakdown_repo.get_age_gender_breakdown(
            start_date, end_date, campaign_id, group_by, campaign_status, search_query, filtered_account_ids
        )

        # Calculate derived metrics for each breakdown
        age_gender_metrics = []
        for breakdown in breakdowns:
            metrics = AgeGenderBreakdown(
                age_group=breakdown['age_group'],
                gender=breakdown['gender'],
                spend=breakdown['spend'],
                impressions=breakdown['impressions'],
                clicks=breakdown['clicks'],
                ctr=self.calculator.ctr(breakdown['clicks'], breakdown['impressions']),
                cpc=self.calculator.cpc(breakdown['spend'], breakdown['clicks']),
                cpm=self.calculator.cpm(breakdown['spend'], breakdown['impressions']),
                conversions=0,
                conversion_value=0.0,
                purchases=0,
                purchase_value=0.0,
                roas=None,
                cpa=0.0
            )
            age_gender_metrics.append(metrics)

        return age_gender_metrics

    def get_placement_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None,
        account_ids: Optional[List[int]] = None
    ) -> List[PlacementBreakdown]:
        """
        Get placement breakdown with calculated metrics.

        Args:
            start_date: Start date
            end_date: End date
            campaign_id: Optional campaign filter

        Returns:
            List of PlacementBreakdown
        """
        # Resolve account IDs
        filtered_account_ids = self._resolve_account_ids(account_ids)

        breakdowns = self.breakdown_repo.get_placement_breakdown(
            start_date, end_date, campaign_id, campaign_status, search_query, filtered_account_ids
        )

        # Calculate derived metrics for each breakdown
        placement_metrics = []
        for breakdown in breakdowns:
            metrics = PlacementBreakdown(
                placement_name=breakdown['placement_name'],
                spend=breakdown['spend'],
                impressions=breakdown['impressions'],
                clicks=breakdown['clicks'],
                ctr=self.calculator.ctr(breakdown['clicks'], breakdown['impressions']),
                cpc=self.calculator.cpc(breakdown['spend'], breakdown['clicks']),
                cpm=self.calculator.cpm(breakdown['spend'], breakdown['impressions']),
                conversions=0,
                conversion_value=0.0,
                purchases=0,
                purchase_value=0.0,
                roas=None,
                cpa=0.0
            )
            placement_metrics.append(metrics)

        return placement_metrics

    def get_platform_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None,
        account_ids: Optional[List[int]] = None
    ) -> List[PlacementBreakdown]:
        """
        Get platform breakdown with calculated metrics.

        Args:
            start_date: Start date
            end_date: End date
            campaign_id: Optional campaign filter

        Returns:
            List of PlacementBreakdown (reusing structure as it fits)
        """
        # Resolve account IDs
        filtered_account_ids = self._resolve_account_ids(account_ids)

        breakdowns = self.breakdown_repo.get_platform_breakdown(
            start_date, end_date, campaign_id, campaign_status, search_query, filtered_account_ids
        )

        # Calculate derived metrics for each breakdown
        platform_metrics = []
        for breakdown in breakdowns:
            metrics = PlacementBreakdown(
                placement_name=breakdown['platform'],
                spend=breakdown['spend'],
                impressions=breakdown['impressions'],
                clicks=breakdown['clicks'],
                ctr=self.calculator.ctr(breakdown['clicks'], breakdown['impressions']),
                cpc=self.calculator.cpc(breakdown['spend'], breakdown['clicks']),
                cpm=self.calculator.cpm(breakdown['spend'], breakdown['impressions']),
                conversions=0,
                conversion_value=0.0,
                purchases=0,
                purchase_value=0.0,
                roas=None,
                cpa=0.0
            )
            platform_metrics.append(metrics)

        return platform_metrics

    def get_creative_metrics(
        self,
        start_date: date,
        end_date: date,
        is_video: Optional[bool] = None,
        min_spend: float = 0,
        sort_by: str = "spend",
        account_ids: Optional[List[int]] = None
    ) -> List[CreativeMetrics]:
        """
        Get creative-level metrics with video metrics.

        Args:
            start_date: Start date
            end_date: End date
            is_video: Filter by video/image creatives
            min_spend: Minimum spend threshold
            sort_by: Metric to sort by
            account_ids: Optional list of account IDs

        Returns:
            List of CreativeMetrics
        """
        # Resolve account IDs
        filtered_account_ids = self._resolve_account_ids(account_ids)

        creatives = self.creative_repo.get_creative_metrics(
            start_date, end_date, is_video, min_spend, filtered_account_ids
        )

        # Calculate derived metrics for each creative
        creative_metrics = []
        for creative in creatives:
            # Calculate video metrics if applicable
            hook_rate = None
            completion_rate = None
            hold_rate = None
            avg_watch_time = None
            
            if creative['is_video'] and creative['video_plays'] > 0:
                avg_watch_time = float(creative.get('video_avg_time_watched') or 0.0)
                hook_rate = self.calculator.hook_rate(
                    creative['video_p25_watched'], creative['video_plays']
                )
                completion_rate = self.calculator.completion_rate(
                    creative['video_p100_watched'], creative['video_plays']
                )
                hold_rate = self.calculator.hold_rate(
                    creative['video_p50_watched'], creative['video_plays']
                )

            metrics = CreativeMetrics(
                creative_id=creative['creative_id'],
                title=creative['title'],
                body=creative['body'],
                is_video=creative['is_video'],
                video_length_seconds=creative['video_length_seconds'],
                image_url=creative['image_url'],
                video_url=creative['video_url'],
                spend=creative['spend'],
                impressions=creative['impressions'],
                clicks=creative['clicks'],
                ctr=self.calculator.ctr(creative['clicks'], creative['impressions']),
                video_plays=creative['video_plays'],
                hook_rate=hook_rate,
                completion_rate=completion_rate,
                hold_rate=hold_rate,
                avg_watch_time=avg_watch_time,
                conversions=creative['conversions'],
                conversion_value=creative['conversion_value'],
                purchases=creative['purchases'],
                purchase_value=creative['purchase_value'],
                roas=self.calculator.roas(creative['conversion_value'], creative['spend'], creative['conversions']),
                cpa=self.calculator.cpa(creative['spend'], creative['conversions'])
            )
            creative_metrics.append(metrics)

        return creative_metrics

    def _calculate_derived_metrics(self, raw_metrics: Dict[str, Any]) -> MetricsPeriod:
        """
        Calculate derived metrics from raw metrics.

        Args:
            raw_metrics: Dict with raw aggregated metrics

        Returns:
            MetricsPeriod with calculated metrics
        """
        conversion_value = raw_metrics['conversion_value']
        purchase_value = raw_metrics['purchase_value']
        purchases = raw_metrics['purchases']
        spend = raw_metrics['spend']
        roas = self.calculator.roas(conversion_value, spend, raw_metrics['conversions'])

        return MetricsPeriod(
            spend=spend,
            impressions=raw_metrics['impressions'],
            clicks=raw_metrics['clicks'],
            ctr=self.calculator.ctr(raw_metrics['clicks'], raw_metrics['impressions']),
            cpc=self.calculator.cpc(spend, raw_metrics['clicks']),
            cpm=self.calculator.cpm(spend, raw_metrics['impressions']),
            conversions=raw_metrics['conversions'],
            conversion_value=conversion_value,
            purchases=purchases,
            purchase_value=purchase_value,
            roas=self.calculator.roas(conversion_value, spend, raw_metrics['conversions']),
            cpa=self.calculator.cpa(spend, raw_metrics['conversions'])
        )

    def get_adset_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None,
        account_ids: Optional[List[int]] = None
    ) -> List[AdsetBreakdown]:
        """
        Get adset-level breakdown with calculated metrics.
        """
        # Resolve account IDs
        filtered_account_ids = self._resolve_account_ids(account_ids)

        adsets = self.adset_repo.get_adset_breakdown(
            start_date, end_date, campaign_id, campaign_status, search_query, filtered_account_ids
        )

        adset_metrics = []
        for adset in adsets:
            metrics = AdsetBreakdown(
                adset_id=adset['adset_id'],
                adset_name=adset['adset_name'],
                targeting_type=adset['targeting_type'],
                targeting_summary=adset['targeting_summary'],
                spend=adset['spend'],
                clicks=adset['clicks'],
                impressions=adset['impressions'],
                ctr=self.calculator.ctr(adset['clicks'], adset['impressions']),
                cpc=self.calculator.cpc(adset['spend'], adset['clicks']),
                conversions=adset['conversions'],
                conversion_value=adset['conversion_value'],
                purchases=adset['purchases'],
                purchase_value=adset['purchase_value'],
                roas=self.calculator.roas(adset['conversion_value'], adset['spend'], adset['conversions']),
                cpa=self.calculator.cpa(adset['spend'], adset['conversions'])
            )
            adset_metrics.append(metrics)

        return adset_metrics

    def get_country_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        top_n: int = 10,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None,
        account_ids: Optional[List[int]] = None
    ) -> List[CountryBreakdown]:
        """
        Get country breakdown with calculated metrics.

        Args:
            start_date: Start date
            end_date: End date
            campaign_id: Optional campaign filter
            top_n: Number of top countries

        Returns:
            List of CountryBreakdown
        """
        # Resolve account IDs
        filtered_account_ids = self._resolve_account_ids(account_ids)

        breakdowns = self.breakdown_repo.get_country_breakdown(
            start_date, end_date, campaign_id, top_n, campaign_status, search_query, filtered_account_ids
        )

        # Calculate derived metrics for each breakdown
        country_metrics = []
        for breakdown in breakdowns:
            metrics = CountryBreakdown(
                country=breakdown['country'],
                spend=breakdown['spend'],
                impressions=breakdown['impressions'],
                clicks=breakdown['clicks'],
                ctr=self.calculator.ctr(breakdown['clicks'], breakdown['impressions']),
                cpc=self.calculator.cpc(breakdown['spend'], breakdown['clicks']),
                cpm=self.calculator.cpm(breakdown['spend'], breakdown['impressions']),
                conversions=0,
                conversion_value=0.0,
                purchases=0,
                purchase_value=0.0,
                roas=None,
                cpa=0.0
            )
            country_metrics.append(metrics)

        return country_metrics

    def get_creative_detail(
        self,
        creative_id: int,
        start_date: date,
        end_date: date
    ) -> Optional[Any]:
        """
        Get detailed metrics for a single creative with trend.

        Args:
            creative_id: Creative ID
            start_date: Start date
            end_date: End date

        Returns:
            CreativeDetailResponse or None
        """
        detail = self.creative_repo.get_creative_detail(creative_id, start_date, end_date)

        if not detail:
            return None

        # Calculate derived metrics
        ctr = self.calculator.ctr(detail['clicks'], detail['impressions'])
        cpc = self.calculator.cpc(detail['spend'], detail['clicks'])
        cpm = self.calculator.cpm(detail['spend'], detail['impressions'])
        roas = self.calculator.roas(detail['conversion_value'], detail['spend'], detail['conversions'])
        cpa = self.calculator.cpa(detail['spend'], detail['conversions'])

        # Calculate video metrics if applicable
        video_metrics = None
        if detail['is_video'] and detail['video_plays'] > 0:
            hook_rate = self.calculator.hook_rate(
                detail['video_p25_watched'], detail['video_plays']
            )
            completion_rate = self.calculator.completion_rate(
                detail['video_p100_watched'], detail['video_plays']
            )
            hold_rate = self.calculator.hold_rate(
                detail['video_p50_watched'], detail['video_plays']
            )

            video_metrics = {
                'hook_rate': hook_rate,
                'completion_rate': completion_rate,
                'hold_rate': hold_rate,
                'video_plays': detail['video_plays']
            }

        # Build metrics period
        metrics = MetricsPeriod(
            spend=detail['spend'],
            impressions=detail['impressions'],
            clicks=detail['clicks'],
            ctr=ctr,
            cpc=cpc,
            cpm=cpm,
            conversions=detail['conversions'],
            conversion_value=detail['conversion_value'],
            purchases=detail['purchases'],
            purchase_value=detail['purchase_value'],
            roas=roas,
            cpa=cpa
        )

        # Calculate trend metrics
        trend = []
        for point in detail['trend']:
            trend_point = TimeSeriesDataPoint(
                date=point['date'],
                spend=point['spend'],
                clicks=point['clicks'],
                impressions=point['impressions'],
                ctr=self.calculator.ctr(point['clicks'], point['impressions']),
                cpc=self.calculator.cpc(point['spend'], point['clicks']),
                cpm=self.calculator.cpm(point['spend'], point['impressions']),
                conversions=point['conversions'],
                roas=self.calculator.roas(point['conversion_value'], point['spend'], point['conversions'])
            )
            trend.append(trend_point)

        from backend.api.schemas.responses import CreativeDetailResponse
        return CreativeDetailResponse(
            creative_id=detail['creative_id'],
            title=detail['title'],
            body=detail['body'],
            is_video=detail['is_video'],
            video_length_seconds=detail['video_length_seconds'],
            image_url=detail['image_url'],
            video_url=detail['video_url'],
            metrics=metrics,
            video_metrics=video_metrics,
            trend=trend
        )

    def get_creative_comparison(
        self,
        creative_ids: List[int],
        start_date: date,
        end_date: date,
        metrics: List[str] = None
    ) -> Any:
        """
        Compare multiple creatives side-by-side.

        Args:
            creative_ids: List of creative IDs (2-5)
            start_date: Start date
            end_date: End date
            metrics: List of metrics to compare

        Returns:
            CreativeComparisonResponse
        """
        creatives = self.creative_repo.get_creative_comparison(
            creative_ids, start_date, end_date
        )

        if not creatives:
            return None

        # Calculate all metrics for each creative
        creative_data = {}
        for creative in creatives:
            ctr = self.calculator.ctr(creative['clicks'], creative['impressions'])
            cpc = self.calculator.cpc(creative['spend'], creative['clicks'])
            roas = self.calculator.roas(creative['conversion_value'], creative['spend'], creative['conversions'])
            hook_rate = None
            completion_rate = None

            if creative['is_video'] and creative['video_plays'] > 0:
                hook_rate = self.calculator.hook_rate(
                    creative['video_p25_watched'], creative['video_plays']
                )
                completion_rate = self.calculator.completion_rate(
                    creative['video_p100_watched'], creative['video_plays']
                )

            creative_data[creative['creative_id']] = {
                'title': creative['title'],
                'spend': creative['spend'],
                'impressions': creative['impressions'],
                'clicks': creative['clicks'],
                'ctr': ctr,
                'cpc': cpc,
                'roas': roas,
                'conversions': creative['conversions'],
                'hook_rate': hook_rate,
                'completion_rate': completion_rate
            }

        # Build comparison metrics
        from backend.api.schemas.responses import CreativeComparisonMetric, CreativeComparisonResponse

        # Determine which metrics to compare
        if not metrics:
            metrics = ['spend', 'roas', 'ctr', 'cpc']

        comparisons = []
        for metric_name in metrics:
            values = {}
            winner_id = None
            winner_value = None

            # Higher is better for: spend, roas, ctr, hook_rate, completion_rate, conversions
            # Lower is better for: cpc, cpa
            is_higher_better = metric_name not in ['cpc', 'cpa']

            for creative_id, data in creative_data.items():
                value = data.get(metric_name)
                if value is not None:
                    values[creative_id] = value

                    if winner_value is None:
                        winner_value = value
                        winner_id = creative_id
                    else:
                        if is_higher_better and value > winner_value:
                            winner_value = value
                            winner_id = creative_id
                        elif not is_higher_better and value < winner_value and value > 0:
                            winner_value = value
                            winner_id = creative_id

            comparison = CreativeComparisonMetric(
                metric_name=metric_name,
                values=values,
                winner_id=winner_id
            )
            comparisons.append(comparison)

        return CreativeComparisonResponse(
            creative_ids=creative_ids,
            comparisons=comparisons
        )

    def get_video_insights(
        self,
        start_date: date,
        end_date: date
    ) -> Any:
        """
        Get AI-style video insights and patterns.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            VideoInsightsResponse
        """
        insights_data = self.creative_repo.get_video_insights(start_date, end_date)

        # Build top videos list with calculated metrics
        from backend.api.schemas.responses import VideoInsightsResponse, VideoInsight

        top_videos = []
        for video in insights_data['top_videos']:
            creative = CreativeMetrics(
                creative_id=video['creative_id'],
                title=video['title'],
                body=None,
                is_video=True,
                video_length_seconds=video['video_length_seconds'],
                image_url=None,
                video_url=None,
                spend=video['spend'],
                impressions=0,
                clicks=0,
                ctr=0.0,
                video_plays=video['video_plays'],
                hook_rate=video['hook_rate'],
                completion_rate=video['completion_rate'],
                hold_rate=None,
                conversions=0,
                roas=None
            )
            top_videos.append(creative)

        # Generate insights based on data
        insights = []
        avg_hook = insights_data['avg_hook_rate']
        avg_completion = insights_data['avg_completion_rate']

        if avg_hook > 0:
            insights.append(VideoInsight(
                message=f"Average hook rate is {avg_hook:.1f}%. Videos that capture attention in the first 25% perform better.",
                confidence=0.85,
                supporting_data={'avg_hook_rate': avg_hook}
            ))

        if avg_completion > 0:
            insights.append(VideoInsight(
                message=f"Average completion rate is {avg_completion:.1f}%. Focus on strong endings to improve retention.",
                confidence=0.80,
                supporting_data={'avg_completion_rate': avg_completion}
            ))

        # Determine best performing length range
        best_length = "15-30 seconds"  # Default recommendation
        if top_videos and top_videos[0].video_length_seconds:
            top_length = top_videos[0].video_length_seconds
            if top_length < 15:
                best_length = "under 15 seconds"
            elif top_length < 30:
                best_length = "15-30 seconds"
            else:
                best_length = "30+ seconds"

        return VideoInsightsResponse(
            average_hook_rate=avg_hook,
            average_completion_rate=avg_completion,
            average_hold_rate=insights_data['avg_hold_rate'],
            average_video_time=insights_data['avg_video_time'],
            best_performing_length=best_length,
            insights=insights,
            top_videos=top_videos
        )

    def _calculate_period_changes(
        self,
        current: MetricsPeriod,
        previous: MetricsPeriod
    ) -> ChangePercentage:
        """
        Calculate percentage change between two periods.

        Args:
            current: Current period metrics
            previous: Previous period metrics

        Returns:
            ChangePercentage with % changes
        """
        return ChangePercentage(
            spend=self.calculator.change_percentage(current.spend, previous.spend),
            impressions=self.calculator.change_percentage(current.impressions, previous.impressions),
            clicks=self.calculator.change_percentage(current.clicks, previous.clicks),
            ctr=self.calculator.change_percentage(current.ctr, previous.ctr),
            cpc=self.calculator.change_percentage(current.cpc, previous.cpc),
            cpm=self.calculator.change_percentage(current.cpm, previous.cpm),
            conversions=self.calculator.change_percentage(current.conversions, previous.conversions),
            conversion_value=self.calculator.change_percentage(current.conversion_value, previous.conversion_value),
            roas=self.calculator.change_percentage(current.roas, previous.roas),
            cpa=self.calculator.change_percentage(current.cpa, previous.cpa)
        )
