"""
Data access layer for historical trend analysis.

This module provides queries for long-term trend analysis, seasonality detection,
and historical performance patterns over extended time periods (30/60/90 days).
"""

from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from backend.api.repositories.base_repository import BaseRepository


class HistoricalRepository(BaseRepository):
    """Repository for historical trend and seasonality queries"""

    def get_weekly_trends(
        self,
        lookback_days: int = 90,
        campaign_id: Optional[int] = None,
        account_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get week-over-week performance trends.

        Args:
            lookback_days: Number of days to look back (default 90)
            campaign_id: Optional campaign filter
            account_ids: Optional list of account IDs to filter by

        Returns:
            List of dicts with weekly metrics and WoW changes
        """
        # Build filters
        campaign_filter = "AND f.campaign_id = :campaign_id" if campaign_id else ""

        account_filter = ""
        param_account_ids = {}
        if account_ids:
            placeholders = ', '.join([f":acc_id_{i}" for i in range(len(account_ids))])
            account_filter = f"AND f.account_id IN ({placeholders})"
            for i, acc_id in enumerate(account_ids):
                param_account_ids[f'acc_id_{i}'] = acc_id

        query = text(f"""
            WITH weekly_metrics AS (
                SELECT
                    DATE_TRUNC('week', d.date)::date as week_start,
                    SUM(f.spend) as spend,
                    SUM(f.impressions) as impressions,
                    SUM(f.clicks) as clicks,
                    COALESCE(SUM(conv.action_count), 0) as conversions,
                    COALESCE(SUM(conv.action_value), 0) as conversion_value,
                    SUM(f.purchases) as purchases,
                    SUM(f.purchase_value) as purchase_value,
                    CASE WHEN SUM(f.impressions) > 0
                         THEN (SUM(f.clicks)::float / SUM(f.impressions)) * 100
                         ELSE 0 END as ctr,
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
                           SUM(action_count) as action_count,
                           SUM(action_value) as action_value
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
                WHERE d.date >= CURRENT_DATE - INTERVAL '{lookback_days} days'
                    {campaign_filter}
                    {account_filter}
                GROUP BY week_start
            )
            SELECT
                week_start,
                spend,
                impressions,
                clicks,
                conversions,
                conversion_value,
                purchases,
                purchase_value,
                ctr,
                roas,
                cpa,
                LAG(spend) OVER (ORDER BY week_start) as prev_week_spend,
                LAG(conversions) OVER (ORDER BY week_start) as prev_week_conversions,
                LAG(ctr) OVER (ORDER BY week_start) as prev_week_ctr,
                LAG(roas) OVER (ORDER BY week_start) as prev_week_roas,
                CASE WHEN LAG(spend) OVER (ORDER BY week_start) > 0
                     THEN ((spend - LAG(spend) OVER (ORDER BY week_start)) /
                           LAG(spend) OVER (ORDER BY week_start)) * 100
                     ELSE 0 END as wow_spend_change_pct,
                CASE WHEN LAG(conversions) OVER (ORDER BY week_start) > 0
                     THEN ((conversions - LAG(conversions) OVER (ORDER BY week_start)) /
                           LAG(conversions) OVER (ORDER BY week_start)) * 100
                     ELSE 0 END as wow_conversions_change_pct,
                CASE WHEN LAG(ctr) OVER (ORDER BY week_start) > 0
                     THEN ((ctr - LAG(ctr) OVER (ORDER BY week_start)) /
                           LAG(ctr) OVER (ORDER BY week_start)) * 100
                     ELSE 0 END as wow_ctr_change_pct,
                CASE WHEN LAG(roas) OVER (ORDER BY week_start) > 0
                     THEN ((roas - LAG(roas) OVER (ORDER BY week_start)) /
                           LAG(roas) OVER (ORDER BY week_start)) * 100
                     ELSE 0 END as wow_roas_change_pct
            FROM weekly_metrics
            ORDER BY week_start
        """)

        params = {**param_account_ids}
        if campaign_id:
            params['campaign_id'] = campaign_id

        result = self.db.execute(query, params).fetchall()

        return [
            {
                'week_start': row.week_start.isoformat() if row.week_start else None,
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'conversions': int(row.conversions or 0),
                'conversion_value': float(row.conversion_value or 0),
                'purchases': int(row.purchases or 0),
                'purchase_value': float(row.purchase_value or 0),
                'ctr': float(row.ctr or 0),
                'roas': float(row.roas or 0),
                'cpa': float(row.cpa or 0),
                'prev_week_spend': float(row.prev_week_spend or 0),
                'prev_week_conversions': int(row.prev_week_conversions or 0),
                'prev_week_ctr': float(row.prev_week_ctr or 0),
                'prev_week_roas': float(row.prev_week_roas or 0),
                'wow_spend_change_pct': float(row.wow_spend_change_pct or 0),
                'wow_conversions_change_pct': float(row.wow_conversions_change_pct or 0),
                'wow_ctr_change_pct': float(row.wow_ctr_change_pct or 0),
                'wow_roas_change_pct': float(row.wow_roas_change_pct or 0),
            }
            for row in result
        ]

    def get_daily_seasonality(
        self,
        lookback_days: int = 90,
        campaign_id: Optional[int] = None,
        account_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get day-of-week performance patterns.

        Args:
            lookback_days: Number of days to look back (default 90)
            campaign_id: Optional campaign filter
            account_ids: Optional list of account IDs to filter by

        Returns:
            List of dicts with average performance by day of week
        """
        # Build filters
        campaign_filter = "AND f.campaign_id = :campaign_id" if campaign_id else ""

        account_filter = ""
        param_account_ids = {}
        if account_ids:
            placeholders = ', '.join([f":acc_id_{i}" for i in range(len(account_ids))])
            account_filter = f"AND f.account_id IN ({placeholders})"
            for i, acc_id in enumerate(account_ids):
                param_account_ids[f'acc_id_{i}'] = acc_id

        query = text(f"""
            SELECT
                d.day_of_week,
                AVG(f.spend) as avg_daily_spend,
                AVG(f.impressions) as avg_daily_impressions,
                AVG(f.clicks) as avg_daily_clicks,
                AVG(COALESCE(conv.action_count, 0)) as avg_daily_conversions,
                AVG(CASE WHEN f.impressions > 0
                         THEN (f.clicks::float / f.impressions) * 100
                         ELSE 0 END) as avg_ctr,
                AVG(CASE WHEN f.spend > 0 AND f.purchases > 0
                         THEN f.purchase_value / f.spend
                         ELSE 0 END) as avg_roas,
                COUNT(DISTINCT d.date) as sample_size
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
            WHERE d.date >= CURRENT_DATE - INTERVAL '{lookback_days} days'
                {campaign_filter}
                {account_filter}
            GROUP BY d.day_of_week
            ORDER BY
                CASE d.day_of_week
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                    WHEN 'Saturday' THEN 6
                    WHEN 'Sunday' THEN 7
                END
        """)

        params = {**param_account_ids}
        if campaign_id:
            params['campaign_id'] = campaign_id

        result = self.db.execute(query, params).fetchall()

        return [
            {
                'day_of_week': row.day_of_week,
                'avg_daily_spend': float(row.avg_daily_spend or 0),
                'avg_daily_impressions': float(row.avg_daily_impressions or 0),
                'avg_daily_clicks': float(row.avg_daily_clicks or 0),
                'avg_daily_conversions': float(row.avg_daily_conversions or 0),
                'avg_ctr': float(row.avg_ctr or 0),
                'avg_roas': float(row.avg_roas or 0),
                'sample_size': int(row.sample_size or 0)
            }
            for row in result
        ]

    def get_day_of_week_breakdown(
        self,
        start_date: date,
        end_date: date,
        account_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get performance breakdown by day of week for a date range.

        Args:
            start_date: Start date
            end_date: End date
            account_ids: Optional list of account IDs to filter by

        Returns:
            List of dicts with metrics aggregated by day of week
        """
        account_filter = ""
        param_account_ids = {}
        if account_ids:
            placeholders = ', '.join([f":acc_id_{i}" for i in range(len(account_ids))])
            account_filter = f"AND f.account_id IN ({placeholders})"
            for i, acc_id in enumerate(account_ids):
                param_account_ids[f'acc_id_{i}'] = acc_id

        query = text(f"""
            SELECT
                d.day_of_week,
                SUM(f.spend) as total_spend,
                SUM(f.impressions) as total_impressions,
                SUM(f.clicks) as total_clicks,
                COALESCE(SUM(conv.action_count), 0) as total_conversions,
                CASE WHEN SUM(f.impressions) > 0
                     THEN (SUM(f.clicks)::float / SUM(f.impressions)) * 100
                     ELSE 0 END as ctr,
                CASE WHEN SUM(f.clicks) > 0
                     THEN SUM(f.spend) / SUM(f.clicks)
                     ELSE 0 END as cpc,
                CASE WHEN COALESCE(SUM(conv.action_count), 0) > 0
                     THEN SUM(f.spend) / COALESCE(SUM(conv.action_count), 0)
                     ELSE 0 END as cpa,
                CASE WHEN SUM(f.spend) > 0 AND SUM(f.purchases) > 0
                     THEN SUM(f.purchase_value) / SUM(f.spend)
                     ELSE NULL END as roas
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
            WHERE d.date BETWEEN :start_date AND :end_date
                {account_filter}
            GROUP BY d.day_of_week
            ORDER BY
                CASE d.day_of_week
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                    WHEN 'Saturday' THEN 6
                    WHEN 'Sunday' THEN 7
                END
        """)

        params = {'start_date': start_date, 'end_date': end_date, **param_account_ids}
        result = self.db.execute(query, params).fetchall()

        return [
            {
                'day_of_week': row.day_of_week,
                'spend': float(row.total_spend or 0),
                'impressions': int(row.total_impressions or 0),
                'clicks': int(row.total_clicks or 0),
                'conversions': int(row.total_conversions or 0),
                'ctr': float(row.ctr or 0),
                'cpc': float(row.cpc or 0),
                'cpa': float(row.cpa or 0),
                'roas': float(row.roas) if row.roas is not None else None
            }
            for row in result
        ]

    def get_campaign_trend_history(
        self,
        campaign_id: int,
        lookback_days: int = 90,
        account_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get daily trend history for a specific campaign.

        Args:
            campaign_id: Campaign ID to analyze
            lookback_days: Number of days to look back (default 90)
            account_ids: Optional list of account IDs to filter by

        Returns:
            List of dicts with daily performance and moving averages
        """
        # Build account filter
        account_filter = ""
        param_account_ids = {}
        if account_ids:
            placeholders = ', '.join([f":acc_id_{i}" for i in range(len(account_ids))])
            account_filter = f"AND f.account_id IN ({placeholders})"
            for i, acc_id in enumerate(account_ids):
                param_account_ids[f'acc_id_{i}'] = acc_id

        query = text(f"""
            WITH daily_metrics AS (
                SELECT
                    d.date,
                    SUM(f.spend) as spend,
                    SUM(f.impressions) as impressions,
                    SUM(f.clicks) as clicks,
                    COALESCE(SUM(conv.action_count), 0) as conversions,
                    SUM(f.purchases) as purchases,
                    SUM(f.purchase_value) as purchase_value,
                    CASE WHEN SUM(f.impressions) > 0
                         THEN (SUM(f.clicks)::float / SUM(f.impressions)) * 100
                         ELSE 0 END as ctr,
                    CASE WHEN SUM(f.spend) > 0 AND SUM(f.purchases) > 0
                         THEN SUM(f.purchase_value) / SUM(f.spend)
                         ELSE 0 END as roas
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
                WHERE f.campaign_id = :campaign_id
                    AND d.date >= CURRENT_DATE - INTERVAL '{lookback_days} days'
                    {account_filter}
                GROUP BY d.date
            )
            SELECT
                date,
                spend,
                impressions,
                clicks,
                conversions,
                purchases,
                purchase_value,
                ctr,
                roas,
                AVG(ctr) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as ctr_7day_avg,
                AVG(roas) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as roas_7day_avg,
                AVG(conversions) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as conversions_7day_avg,
                FIRST_VALUE(ctr) OVER (ORDER BY date) as initial_ctr,
                FIRST_VALUE(roas) OVER (ORDER BY date) as initial_roas
            FROM daily_metrics
            ORDER BY date
        """)

        params = {'campaign_id': campaign_id, **param_account_ids}
        result = self.db.execute(query, params).fetchall()

        return [
            {
                'date': row.date.isoformat() if row.date else None,
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'conversions': int(row.conversions or 0),
                'purchases': int(row.purchases or 0),
                'purchase_value': float(row.purchase_value or 0),
                'ctr': float(row.ctr or 0),
                'roas': float(row.roas or 0),
                'ctr_7day_avg': float(row.ctr_7day_avg or 0),
                'roas_7day_avg': float(row.roas_7day_avg or 0),
                'conversions_7day_avg': float(row.conversions_7day_avg or 0),
                'initial_ctr': float(row.initial_ctr or 0),
                'initial_roas': float(row.initial_roas or 0)
            }
            for row in result
        ]
