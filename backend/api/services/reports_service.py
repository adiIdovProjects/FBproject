"""
Reports Service
Handles comparison report generation and data aggregation
"""

from datetime import date
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import logging

from backend.api.repositories.metrics_repository import MetricsRepository
from backend.api.repositories.campaign_repository import CampaignRepository
from backend.api.repositories.adset_repository import AdSetRepository
from backend.api.repositories.ad_repository import AdRepository
from backend.api.repositories.timeseries_repository import TimeSeriesRepository
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

    def __init__(self, db: Session, user_id: Optional[int] = None):
        self.db = db
        self.user_id = user_id
        self.repository = MetricsRepository(db)
        self.campaign_repo = CampaignRepository(db)
        self.adset_repo = AdSetRepository(db)
        self.ad_repo = AdRepository(db)
        self.timeseries_repo = TimeSeriesRepository(db)
        self.comparison_service = ComparisonService()

    def _get_user_account_ids(self) -> Optional[List[int]]:
        """Get account IDs for current user (for data filtering)"""
        if not self.user_id:
            return None
        from backend.api.repositories.user_repository import UserRepository
        user_repo = UserRepository(self.db)
        return user_repo.get_user_account_ids(self.user_id)

    def _calculate_metrics(self, raw_data: Dict[str, Any]) -> MetricsPeriod:
        """
        Calculate derived metrics from raw data.

        Args:
            raw_data: Raw metrics from database (spend, impressions, clicks, etc.)

        Returns:
            MetricsPeriod with all calculated metrics
        """
        spend = float(raw_data.get('spend') or 0.0)
        impressions = int(raw_data.get('impressions') or 0)
        clicks = int(raw_data.get('clicks') or 0)
        conversions = int(raw_data.get('conversions') or 0)
        conversion_value = float(raw_data.get('conversion_value') or 0.0)
        purchases = int(raw_data.get('purchases') or 0)
        purchase_value = float(raw_data.get('purchase_value') or 0.0)

        # Calculate derived metrics using MetricCalculator
        from backend.api.utils.calculations import MetricCalculator
        calc = MetricCalculator()

        ctr = calc.ctr(clicks, impressions)
        cpc = calc.cpc(spend, clicks)
        cpm = calc.cpm(spend, impressions)
        roas = calc.roas(conversion_value, spend, conversions)
        cpa = calc.cpa(spend, conversions)
        conversion_rate = calc.conversion_rate(conversions, clicks)

        return MetricsPeriod(
            spend=spend,
            impressions=impressions,
            clicks=clicks,
            ctr=round(ctr, 2),
            cpc=round(cpc, 2),
            cpm=round(cpm, 2),
            conversions=conversions,
            conversion_value=conversion_value,
            purchases=purchases,
            purchase_value=purchase_value,
            roas=round(roas, 2) if roas is not None else None,
            cpa=round(cpa, 2),
            conversion_rate=round(conversion_rate, 2)
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
            cpa=self.comparison_service.calculate_change_percentage(period1.cpa, period2.cpa),
            conversion_rate=self.comparison_service.calculate_change_percentage(period1.conversion_rate, period2.conversion_rate)
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
            'cpa': self.comparison_service.calculate_absolute_change(period1.cpa, period2.cpa),
            'conversion_rate': self.comparison_service.calculate_absolute_change(period1.conversion_rate, period2.conversion_rate)
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
        secondary_breakdown: str = 'none',
        tertiary_breakdown: str = 'none',
        campaign_filter: Optional[str] = None,
        ad_set_filter: Optional[str] = None,
        ad_filter: Optional[str] = None,
        account_id: Optional[str] = None
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
            secondary_breakdown: Secondary dimension for multi-dimensional breakdown (optional)
            campaign_filter: Optional campaign name filter
            ad_set_filter: Optional ad set name filter
            ad_filter: Optional ad name filter

        Returns:
            ReportsComparisonResponse with comparison data
        """
        # Get user's account IDs for filtering/currency
        if account_id and account_id != 'all':
            account_ids = [int(account_id)]
        else:
            account_ids = self._get_user_account_ids()

        logger.info(f"Report Request: account_id={account_id}, period1={period1_start} to {period1_end}, breakdown={breakdown}")
        currency = self.repository.get_account_currency(account_ids)

        # Handle multi-dimensional breakdown (2D or 3D)
        if secondary_breakdown != 'none':
            return self._get_multi_dimensional_breakdown(
                period1_start, period1_end,
                period2_start, period2_end,
                breakdown,
                secondary_breakdown,
                tertiary_breakdown,
                campaign_filter,
                ad_set_filter,
                ad_filter,
                currency,
                account_ids
            )

        # Use breakdown parameter instead of dimension
        if breakdown == 'none':
            return self._get_overview_comparison(
                period1_start, period1_end,
                period2_start, period2_end,
                currency,
                account_ids
            )
        elif breakdown == 'campaign_name':
            return self._get_campaign_comparison(
                period1_start, period1_end,
                period2_start, period2_end,
                campaign_filter,
                currency,
                account_ids
            )
        elif breakdown == 'ad_set_name':
            return self._get_adset_comparison(
                period1_start, period1_end,
                period2_start, period2_end,
                campaign_filter,
                ad_set_filter,
                currency,
                account_ids
            )
        elif breakdown == 'ad_name':
            return self._get_ad_comparison(
                period1_start, period1_end,
                period2_start, period2_end,
                campaign_filter,
                ad_set_filter,
                ad_filter,
                currency,
                account_ids
            )
        elif breakdown in ['date', 'week', 'month']:
            return self._get_time_breakdown(
                period1_start, period1_end,
                period2_start, period2_end,
                breakdown,
                campaign_filter,
                ad_set_filter,
                ad_filter,
                currency,
                account_ids
            )
        else:
            raise ValueError(f"Invalid breakdown: {breakdown}")

    def _get_overview_comparison(
        self,
        period1_start: date,
        period1_end: date,
        period2_start: Optional[date],
        period2_end: Optional[date],
        currency: str,
        account_ids: Optional[List[int]] = None
    ) -> ReportsComparisonResponse:
        """Get overview-level comparison"""
        # account_ids is already filtered/validated by the caller

        # Fetch data for period 1
        period1_raw = self.repository.get_aggregated_metrics(period1_start, period1_end, account_ids=account_ids)
        logger.info(f"Overview Metrics Raw: {period1_raw}")
        period1_metrics = self._calculate_metrics(period1_raw)

        # Fetch period 2 data only if comparison is enabled
        if period2_start and period2_end:
            period2_raw = self.repository.get_aggregated_metrics(period2_start, period2_end, account_ids=account_ids)
            period2_metrics = self._calculate_metrics(period2_raw)
            change_pct, change_abs = self._calculate_changes(period1_metrics, period2_metrics)
        else:
            # No comparison - use zeros for period 2
            # No comparison - use zeros for period 2
            period2_metrics = MetricsPeriod(
                spend=0, impressions=0, clicks=0, ctr=0, cpc=0, cpm=0,
                conversions=0, conversion_value=0, roas=None, cpa=0, conversion_rate=0
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
        currency: str,
        account_ids: Optional[List[int]] = None
    ) -> ReportsComparisonResponse:
        """Get campaign-level comparison"""
        # account_ids is already filtered/validated by the caller

        # Fetch campaign breakdowns for both periods
        period1_campaigns = self.campaign_repo.get_campaign_breakdown(
            period1_start, period1_end, search_query=campaign_filter, account_ids=account_ids
        )

        # Only fetch period2 if comparison is enabled
        if period2_start and period2_end:
            period2_campaigns = self.campaign_repo.get_campaign_breakdown(
                period2_start, period2_end, search_query=campaign_filter, account_ids=account_ids
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
        currency: str,
        account_ids: Optional[List[int]] = None
    ) -> ReportsComparisonResponse:
        """Get ad set-level comparison"""
        # account_ids is already filtered/validated by the caller

        # Fetch adset breakdowns for both periods
        period1_adsets = self.adset_repo.get_adset_breakdown(
            period1_start, period1_end,
            search_query=adset_filter,
            account_ids=account_ids
        )

        # Only fetch period2 if comparison is enabled
        if period2_start and period2_end:
            period2_adsets = self.adset_repo.get_adset_breakdown(
                period2_start, period2_end,
                search_query=adset_filter,
                account_ids=account_ids
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
        currency: str,
        account_ids: Optional[List[int]] = None
    ) -> ReportsComparisonResponse:
        """Get ad-level comparison"""
        # account_ids is already filtered/validated by the caller

        # Fetch ad breakdowns for both periods
        period1_ads = self.ad_repo.get_ad_breakdown(
            period1_start, period1_end,
            campaign_filter=campaign_filter,
            adset_filter=adset_filter,
            search_query=ad_filter,
            account_ids=account_ids
        )

        # Only fetch period2 if comparison is enabled
        if period2_start and period2_end:
            period2_ads = self.ad_repo.get_ad_breakdown(
                period2_start, period2_end,
                campaign_filter=campaign_filter,
                adset_filter=adset_filter,
                search_query=ad_filter,
                account_ids=account_ids
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
        currency: str,
        account_ids: Optional[List[int]] = None
    ) -> ReportsComparisonResponse:
        """Get time-based breakdown (date/week/month)"""
        # account_ids is already filtered/validated by the caller

        # Map breakdown_type to granularity
        granularity_map = {
            'date': 'day',
            'week': 'week',
            'month': 'month'
        }
        granularity = granularity_map.get(breakdown_type, 'day')

        # Fetch time-series data for period 1
        period1_timeseries = self.timeseries_repo.get_time_series(
            start_date=period1_start,
            end_date=period1_end,
            granularity=granularity,
            account_ids=account_ids
        )

        # Only fetch period2 if comparison is enabled
        if period2_start and period2_end:
            period2_timeseries = self.timeseries_repo.get_time_series(
                start_date=period2_start,
                end_date=period2_end,
                granularity=granularity,
                account_ids=account_ids
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

    def _get_multi_dimensional_breakdown(
        self,
        period1_start: date,
        period1_end: date,
        period2_start: Optional[date],
        period2_end: Optional[date],
        primary_breakdown: str,
        secondary_breakdown: str,
        tertiary_breakdown: str = 'none',
        campaign_filter: Optional[str] = None,
        ad_set_filter: Optional[str] = None,
        ad_filter: Optional[str] = None,
        currency: str = 'USD',
        account_ids: Optional[List[int]] = None
    ) -> ReportsComparisonResponse:
        """
        Get multi-dimensional breakdown (e.g., Campaign + Week + Platform).

        Strategy: Use SQL GROUP BY with 2 or 3 dimensions, create flat rows
        with compound names like "Campaign A - Week 1 - Instagram".

        Args:
            period1_start: Period 1 start date
            period1_end: Period 1 end date
            period2_start: Period 2 start date (optional)
            period2_end: Period 2 end date (optional)
            primary_breakdown: Primary dimension
            secondary_breakdown: Secondary dimension
            tertiary_breakdown: Tertiary dimension (optional, for 3D reports)
            campaign_filter: Optional campaign name filter
            ad_set_filter: Optional ad set name filter
            ad_filter: Optional ad name filter
            currency: Account currency
            account_ids: Optional list of account IDs to filter by (already validated)

        Returns:
            ReportsComparisonResponse with flat comparison items
        """
        from sqlalchemy import text

        # Check if any breakdown requires special fact tables
        special_breakdowns = ['placement', 'platform', 'age', 'gender', 'country']
        breakdowns = [primary_breakdown, secondary_breakdown]
        if tertiary_breakdown != 'none':
            breakdowns.append(tertiary_breakdown)

        has_special = any(b in special_breakdowns for b in breakdowns)

        # Determine fact table based on special breakdowns
        if 'placement' in breakdowns or 'platform' in breakdowns:
            fact_table = 'fact_placement_metrics'
        elif 'age' in breakdowns or 'gender' in breakdowns:
            fact_table = 'fact_age_gender_metrics'
        elif 'country' in breakdowns:
            fact_table = 'fact_country_metrics'
        else:
            fact_table = 'fact_core_metrics'

        # Map dimension types to SQL expressions and joins
        # For special breakdowns, we need different expressions depending on the fact table
        dimension_sql = {
            'campaign_name': ('c.campaign_name', 'dim_campaign c', 'f.campaign_id = c.campaign_id'),
            'ad_set_name': ('a.adset_name', 'dim_adset a', 'f.adset_id = a.adset_id'),
            'ad_name': ('ad.ad_name', 'dim_ad ad', 'f.ad_id = ad.ad_id'),
            'date': ("TO_CHAR(d.date, 'YYYY-MM-DD')", None, None),
            'week': ("TO_CHAR(DATE_TRUNC('week', d.date), 'YYYY-MM-DD')", None, None),
            'month': ("TO_CHAR(DATE_TRUNC('month', d.date), 'YYYY-MM-DD')", None, None),
            'placement': ('p.placement_name', 'dim_placement p', 'f.placement_id = p.placement_id'),
            'platform': ("SPLIT_PART(p.placement_name, ' ', 1)", 'dim_placement p', 'f.placement_id = p.placement_id'),
            'age': ('ag.age_group', 'dim_age ag', 'f.age_id = ag.age_id'),
            'gender': ('g.gender', 'dim_gender g', 'f.gender_id = g.gender_id'),
            'country': ('co.country', 'dim_country co', 'f.country_id = co.country_id'),
        }

        primary_expr, primary_join_table, primary_join_cond = dimension_sql[primary_breakdown]
        secondary_expr, secondary_join_table, secondary_join_cond = dimension_sql[secondary_breakdown]

        # Handle tertiary breakdown
        tertiary_expr = None
        tertiary_join_table = None
        tertiary_join_cond = None
        if tertiary_breakdown != 'none':
            tertiary_expr, tertiary_join_table, tertiary_join_cond = dimension_sql[tertiary_breakdown]

        # Build joins list
        joins = []
        added_tables = set()

        # dim_date is always needed
        joins.append("JOIN dim_date d ON f.date_id = d.date_id")
        added_tables.add('d')

        # Helper to add a join if not already present
        def add_join(join_table, join_cond):
            if join_table:
                table_alias = join_table.split()[1] if ' ' in join_table else join_table.split()[0]
                if table_alias not in added_tables:
                    joins.append(f"JOIN {join_table} ON {join_cond}")
                    added_tables.add(table_alias)

        add_join(primary_join_table, primary_join_cond)
        add_join(secondary_join_table, secondary_join_cond)
        if tertiary_join_table:
            add_join(tertiary_join_table, tertiary_join_cond)

        # Build WHERE clause
        where_clauses = [
            "d.date >= :start_date",
            "d.date <= :end_date"
        ]

        # Add account filter if specified
        if account_ids:
            where_clauses.append("f.account_id = ANY(:account_ids)")

        # Add filters (only if the required joins exist)
        if campaign_filter and 'c' in added_tables:
            where_clauses.append("c.campaign_name ILIKE :campaign_filter")
        if ad_set_filter and 'a' in added_tables:
            where_clauses.append("a.adset_name ILIKE :ad_set_filter")
        if ad_filter and 'ad' in added_tables:
            where_clauses.append("ad.ad_name ILIKE :ad_filter")

        where_clause = " AND ".join(where_clauses)

        # Build SELECT and GROUP BY based on 2D or 3D
        if tertiary_breakdown != 'none':
            select_dims = f"{primary_expr} as primary_value, {secondary_expr} as secondary_value, {tertiary_expr} as tertiary_value"
            group_by = f"{primary_expr}, {secondary_expr}, {tertiary_expr}"
            order_by = "1, 2, 3"
        else:
            select_dims = f"{primary_expr} as primary_value, {secondary_expr} as secondary_value"
            group_by = f"{primary_expr}, {secondary_expr}"
            order_by = "1, 2"

        # Build the query - for special breakdowns, we don't have conversion data in those tables
        if has_special:
            query = text(f"""
                SELECT
                    {select_dims},
                    SUM(f.spend) as spend,
                    SUM(f.impressions) as impressions,
                    SUM(f.clicks) as clicks,
                    0 as conversions,
                    0 as conversion_value
                FROM {fact_table} f
                {' '.join(joins)}
                WHERE {where_clause}
                GROUP BY {group_by}
                ORDER BY {order_by}
                LIMIT 1000
            """)
        else:
            query = text(f"""
                SELECT
                    {select_dims},
                    SUM(f.spend) as spend,
                    SUM(f.impressions) as impressions,
                    SUM(f.clicks) as clicks,
                    COALESCE(SUM(conv.action_count), 0) as conversions,
                    COALESCE(SUM(conv.action_value), 0) as conversion_value
                FROM {fact_table} f
                {' '.join(joins)}
                LEFT JOIN (
                    SELECT
                        fam.date_id,
                        fam.account_id,
                        fam.campaign_id,
                        fam.adset_id,
                        fam.ad_id,
                        fam.creative_id,
                        SUM(fam.action_count) as action_count,
                        SUM(fam.action_value) as action_value
                    FROM fact_action_metrics fam
                    JOIN dim_action_type dat ON fam.action_type_id = dat.action_type_id
                    JOIN dim_date d2 ON fam.date_id = d2.date_id
                    WHERE dat.is_conversion = TRUE
                        AND d2.date >= :start_date
                        AND d2.date <= :end_date
                    GROUP BY fam.date_id, fam.account_id, fam.campaign_id, fam.adset_id, fam.ad_id, fam.creative_id
                ) conv ON f.date_id = conv.date_id
                    AND f.account_id = conv.account_id
                    AND f.campaign_id = conv.campaign_id
                    AND f.adset_id = conv.adset_id
                    AND f.ad_id = conv.ad_id
                    AND f.creative_id = conv.creative_id
                WHERE {where_clause}
                GROUP BY {group_by}
                ORDER BY {order_by}
                LIMIT 1000
            """)

        # Build params dict
        params = {
            'start_date': period1_start,
            'end_date': period1_end
        }
        if account_ids:
            params['account_ids'] = [int(aid) for aid in account_ids]
        if campaign_filter and 'c' in added_tables:
            params['campaign_filter'] = f"%{campaign_filter}%"
        if ad_set_filter and 'a' in added_tables:
            params['ad_set_filter'] = f"%{ad_set_filter}%"
        if ad_filter and 'ad' in added_tables:
            params['ad_filter'] = f"%{ad_filter}%"

        # Execute for period 1
        period1_results = self.db.execute(query, params).fetchall()

        # Execute for period 2 if provided
        period2_lookup = {}
        if period2_start and period2_end:
            params2 = {
                'start_date': period2_start,
                'end_date': period2_end
            }
            if account_ids:
                params2['account_ids'] = [int(aid) for aid in account_ids]
            if campaign_filter and 'c' in added_tables:
                params2['campaign_filter'] = f"%{campaign_filter}%"
            if ad_set_filter and 'a' in added_tables:
                params2['ad_set_filter'] = f"%{ad_set_filter}%"
            if ad_filter and 'ad' in added_tables:
                params2['ad_filter'] = f"%{ad_filter}%"

            period2_results = self.db.execute(query, params2).fetchall()

            # Create lookup by tuple (2D or 3D key)
            for row in period2_results:
                if tertiary_breakdown != 'none':
                    key = (str(row.primary_value), str(row.secondary_value), str(row.tertiary_value))
                else:
                    key = (str(row.primary_value), str(row.secondary_value))
                period2_lookup[key] = row

        # Build comparison items with compound names
        comparison_items = []

        for row in period1_results:
            # Create compound name (2D or 3D)
            primary_val = str(row.primary_value)
            secondary_val = str(row.secondary_value)
            tertiary_val = None

            if tertiary_breakdown != 'none':
                tertiary_val = str(row.tertiary_value)
                name = f"{primary_val} - {secondary_val} - {tertiary_val}"
                key = (primary_val, secondary_val, tertiary_val)
                item_id = f"{primary_val}_{secondary_val}_{tertiary_val}"
            else:
                name = f"{primary_val} - {secondary_val}"
                key = (primary_val, secondary_val)
                item_id = f"{primary_val}_{secondary_val}"

            # Calculate period 1 metrics
            period1_metrics = self._calculate_metrics({
                'spend': row.spend or 0,
                'impressions': row.impressions or 0,
                'clicks': row.clicks or 0,
                'conversions': row.conversions or 0,
                'conversion_value': row.conversion_value or 0
            })

            # Find matching period 2 row
            period2_row = period2_lookup.get(key)

            if period2_row:
                period2_metrics = self._calculate_metrics({
                    'spend': period2_row.spend or 0,
                    'impressions': period2_row.impressions or 0,
                    'clicks': period2_row.clicks or 0,
                    'conversions': period2_row.conversions or 0,
                    'conversion_value': period2_row.conversion_value or 0
                })
            else:
                # No matching period 2 data, use zeros
                period2_metrics = self._calculate_metrics({
                    'spend': 0,
                    'impressions': 0,
                    'clicks': 0,
                    'conversions': 0,
                    'conversion_value': 0
                })

            # Calculate changes
            change_pct, change_abs = self._calculate_changes(period1_metrics, period2_metrics)

            logger.info(f"Multi-dim item: primary={primary_val}, secondary={secondary_val}, tertiary={tertiary_val}")
            comparison_items.append(ComparisonItem(
                id=item_id,
                name=name,
                period1=period1_metrics,
                period2=period2_metrics,
                change_pct=change_pct,
                change_abs=change_abs,
                primary_value=primary_val,
                secondary_value=secondary_val,
                tertiary_value=tertiary_val
            ))

        # Build dimension string
        if tertiary_breakdown != 'none':
            dimension_str = f"{primary_breakdown}_{secondary_breakdown}_{tertiary_breakdown}"
        else:
            dimension_str = f"{primary_breakdown}_{secondary_breakdown}"

        return ReportsComparisonResponse(
            dimension=dimension_str,
            period1_start=period1_start.isoformat(),
            period1_end=period1_end.isoformat(),
            period2_start=period2_start.isoformat() if period2_start else None,
            period2_end=period2_end.isoformat() if period2_end else None,
            overview=None,
            items=comparison_items,
            currency=currency
        )
