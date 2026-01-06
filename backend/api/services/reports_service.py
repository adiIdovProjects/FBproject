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

    def __init__(self, db: Session):
        self.db = db
        self.repository = MetricsRepository(db)
        self.campaign_repo = CampaignRepository(db)
        self.adset_repo = AdSetRepository(db)
        self.ad_repo = AdRepository(db)
        self.timeseries_repo = TimeSeriesRepository(db)
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
        secondary_breakdown: str = 'none',
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
            secondary_breakdown: Secondary dimension for multi-dimensional breakdown (optional)
            campaign_filter: Optional campaign name filter
            ad_set_filter: Optional ad set name filter
            ad_filter: Optional ad name filter

        Returns:
            ReportsComparisonResponse with comparison data
        """
        currency = self.repository.get_account_currency()

        # Handle multi-dimensional breakdown
        if secondary_breakdown != 'none':
            return self._get_multi_dimensional_breakdown(
                period1_start, period1_end,
                period2_start, period2_end,
                breakdown,
                secondary_breakdown,
                campaign_filter,
                ad_set_filter,
                ad_filter,
                currency
            )

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
        period1_campaigns = self.campaign_repo.get_campaign_breakdown(
            period1_start, period1_end, search_query=campaign_filter
        )

        # Only fetch period2 if comparison is enabled
        if period2_start and period2_end:
            period2_campaigns = self.campaign_repo.get_campaign_breakdown(
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
        period1_adsets = self.adset_repo.get_adset_breakdown(
            period1_start, period1_end,
            search_query=adset_filter
        )

        # Only fetch period2 if comparison is enabled
        if period2_start and period2_end:
            period2_adsets = self.adset_repo.get_adset_breakdown(
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
        period1_ads = self.ad_repo.get_ad_breakdown(
            period1_start, period1_end,
            search_query=ad_filter
        )

        # Only fetch period2 if comparison is enabled
        if period2_start and period2_end:
            period2_ads = self.ad_repo.get_ad_breakdown(
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
        period1_timeseries = self.timeseries_repo.get_time_series(
            start_date=period1_start,
            end_date=period1_end,
            granularity=granularity
        )

        # Only fetch period2 if comparison is enabled
        if period2_start and period2_end:
            period2_timeseries = self.timeseries_repo.get_time_series(
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

    def _get_multi_dimensional_breakdown(
        self,
        period1_start: date,
        period1_end: date,
        period2_start: Optional[date],
        period2_end: Optional[date],
        primary_breakdown: str,
        secondary_breakdown: str,
        campaign_filter: Optional[str],
        ad_set_filter: Optional[str],
        ad_filter: Optional[str],
        currency: str
    ) -> ReportsComparisonResponse:
        """
        Get multi-dimensional breakdown (e.g., Campaign + Week).

        Strategy: Use SQL GROUP BY with both dimensions, create flat rows
        with compound names like "Campaign A - Week 1".

        Args:
            period1_start: Period 1 start date
            period1_end: Period 1 end date
            period2_start: Period 2 start date (optional)
            period2_end: Period 2 end date (optional)
            primary_breakdown: Primary dimension
            secondary_breakdown: Secondary dimension
            campaign_filter: Optional campaign name filter
            ad_set_filter: Optional ad set name filter
            ad_filter: Optional ad name filter
            currency: Account currency

        Returns:
            ReportsComparisonResponse with flat comparison items
        """
        from sqlalchemy import text

        # Map dimension types to SQL expressions and joins
        dimension_sql = {
            'campaign_name': ('c.campaign_name', 'dim_campaign c', 'f.campaign_id = c.campaign_id'),
            'ad_set_name': ('a.adset_name', 'dim_adset a', 'f.adset_id = a.adset_id'),
            'ad_name': ('ad.ad_name', 'dim_ad ad', 'f.ad_id = ad.ad_id'),
            'date': ('d.date', None, None),
            'week': ("TO_CHAR(DATE_TRUNC('week', d.date), 'YYYY-MM-DD')", None, None),
            'month': ("TO_CHAR(DATE_TRUNC('month', d.date), 'YYYY-MM-DD')", None, None),
        }

        primary_expr, primary_join_table, primary_join_cond = dimension_sql[primary_breakdown]
        secondary_expr, secondary_join_table, secondary_join_cond = dimension_sql[secondary_breakdown]

        # Build joins list
        joins = []
        # dim_date is always needed
        joins.append("JOIN dim_date d ON f.date_id = d.date_id")

        # Add primary dimension join if needed
        if primary_join_table:
            joins.append(f"JOIN {primary_join_table} ON {primary_join_cond}")

        # Add secondary dimension join if needed and not already added
        if secondary_join_table:
            # Check if this table isn't already in joins
            table_alias = secondary_join_table.split()[0]
            if not any(table_alias in j for j in joins):
                joins.append(f"JOIN {secondary_join_table} ON {secondary_join_cond}")

        # Build WHERE clause
        where_clauses = [
            "d.date >= :start_date",
            "d.date <= :end_date"
        ]

        # Add filters
        if campaign_filter:
            where_clauses.append("c.campaign_name ILIKE :campaign_filter")
        if ad_set_filter:
            where_clauses.append("a.adset_name ILIKE :ad_set_filter")
        if ad_filter:
            where_clauses.append("ad.ad_name ILIKE :ad_filter")

        where_clause = " AND ".join(where_clauses)

        # Build the query
        query = text(f"""
            SELECT
                {primary_expr} as primary_value,
                {secondary_expr} as secondary_value,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                COALESCE(SUM(conv.action_count), 0) as conversions,
                COALESCE(SUM(conv.action_value), 0) as conversion_value
            FROM fact_core_metrics f
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
                WHERE dat.is_conversion = TRUE
                GROUP BY fam.date_id, fam.account_id, fam.campaign_id, fam.adset_id, fam.ad_id, fam.creative_id
            ) conv ON f.date_id = conv.date_id
                AND f.account_id = conv.account_id
                AND f.campaign_id = conv.campaign_id
                AND f.adset_id = conv.adset_id
                AND f.ad_id = conv.ad_id
                AND f.creative_id = conv.creative_id
            WHERE {where_clause}
            GROUP BY {primary_expr}, {secondary_expr}
            ORDER BY 1, 2
            LIMIT 1000
        """)

        # Build params dict
        params = {
            'start_date': period1_start,
            'end_date': period1_end
        }
        if campaign_filter:
            params['campaign_filter'] = f"%{campaign_filter}%"
        if ad_set_filter:
            params['ad_set_filter'] = f"%{ad_set_filter}%"
        if ad_filter:
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
            if campaign_filter:
                params2['campaign_filter'] = f"%{campaign_filter}%"
            if ad_set_filter:
                params2['ad_set_filter'] = f"%{ad_set_filter}%"
            if ad_filter:
                params2['ad_filter'] = f"%{ad_filter}%"

            period2_results = self.db.execute(query, params2).fetchall()

            # Create lookup by (primary, secondary) tuple
            for row in period2_results:
                key = (str(row.primary_value), str(row.secondary_value))
                period2_lookup[key] = row

        # Build comparison items with compound names
        comparison_items = []

        for row in period1_results:
            # Create compound name
            primary_val = str(row.primary_value)
            secondary_val = str(row.secondary_value)
            name = f"{primary_val} - {secondary_val}"

            # Calculate period 1 metrics
            period1_metrics = self._calculate_metrics({
                'spend': row.spend or 0,
                'impressions': row.impressions or 0,
                'clicks': row.clicks or 0,
                'conversions': row.conversions or 0,
                'conversion_value': row.conversion_value or 0
            })

            # Find matching period 2 row
            key = (primary_val, secondary_val)
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

            comparison_items.append(ComparisonItem(
                id=f"{primary_val}_{secondary_val}",
                name=name,
                period1=period1_metrics,
                period2=period2_metrics,
                change_pct=change_pct,
                change_abs=change_abs
            ))

        return ReportsComparisonResponse(
            dimension=f"{primary_breakdown}_{secondary_breakdown}",
            period1_start=period1_start.isoformat(),
            period1_end=period1_end.isoformat(),
            period2_start=period2_start.isoformat() if period2_start else None,
            period2_end=period2_end.isoformat() if period2_end else None,
            overview=None,
            items=comparison_items,
            currency=currency
        )
