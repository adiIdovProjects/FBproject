"""
Data access layer for metrics queries.

This module contains all database queries for retrieving metrics data.
Uses SQLAlchemy Core for raw SQL queries with proper parameter binding.
"""

from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)


class MetricsRepository:
    """Repository for metrics data access"""

    def __init__(self, db: Session):
        self.db = db

    def get_account_currency(self) -> str:
        """
        Get the currency from dim_account table.

        Returns:
            Currency code (e.g., 'USD', 'EUR', 'ILS')
        """
        query = text("""
            SELECT currency
            FROM dim_account
            WHERE account_id != 0
            LIMIT 1
        """)

        try:
            result = self.db.execute(query).fetchone()
            if result and result.currency:
                return result.currency
            return "USD"  # Default fallback
        except Exception as e:
            logger.warning(f"Failed to fetch currency from database: {e}")
            return "USD"  # Default fallback

    def get_aggregated_metrics(
        self,
        start_date: date,
        end_date: date,
        campaign_status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get aggregated metrics for a date range.

        Args:
            start_date: Start date
            end_date: End date
            campaign_status: Optional status filter (ACTIVE, PAUSED, ALL)

        Returns:
            Dict with aggregated metrics
        """
        query = text("""
            SELECT
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value,
                SUM(f.leads) as leads,
                SUM(f.add_to_cart) as add_to_cart,
                SUM(f.video_plays) as video_plays,
                SUM(f.video_p25_watched) as video_p25_watched,
                SUM(f.video_p50_watched) as video_p50_watched,
                SUM(f.video_p75_watched) as video_p75_watched,
                SUM(f.video_p100_watched) as video_p100_watched,
                CASE WHEN SUM(f.video_plays) > 0 
                     THEN SUM(f.video_avg_time_watched * f.video_plays) / SUM(f.video_plays) 
                     ELSE 0 END as video_avg_time_watched
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_campaign c ON f.campaign_id = c.campaign_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                AND (:status IS NULL OR :status = 'ALL' OR c.campaign_status = :status)
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            'status': campaign_status
        }

        result = self.db.execute(query, params).fetchone()

        if not result:
            return self._empty_metrics()

        return {
            'spend': float(result.spend or 0),
            'impressions': int(result.impressions or 0),
            'clicks': int(result.clicks or 0),
            'purchases': int(result.purchases or 0),
            'purchase_value': float(result.purchase_value or 0),
            'leads': int(result.leads or 0),
            'add_to_cart': int(result.add_to_cart or 0),
            'video_plays': int(result.video_plays or 0),
            'video_p25_watched': int(result.video_p25_watched or 0),
            'video_p50_watched': int(result.video_p50_watched or 0),
            'video_p75_watched': int(result.video_p75_watched or 0),
            'video_p100_watched': int(result.video_p100_watched or 0),
            'video_avg_time_watched': float(result.video_avg_time_watched or 0)
        }

    def get_campaign_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None,
        sort_by: str = "spend",
        sort_direction: str = "desc",
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get campaign-level metrics breakdown.

        Args:
            start_date: Start date
            end_date: End date
            campaign_status: Optional list of statuses to filter by
            search_query: Optional search string for campaign name
            sort_by: Column to sort by
            sort_direction: asc or desc
            limit: Maximum number of results

        Returns:
            List of campaign metrics dicts
        """
        # Build status filter
        status_filter = ""
        if campaign_status and campaign_status != ['ALL']:
            placeholders = ', '.join([f":status_{i}" for i in range(len(campaign_status))])
            status_filter = f"AND c.campaign_status IN ({placeholders})"
            
        # Build search filter
        search_filter = ""
        if search_query:
            search_filter = "AND LOWER(c.campaign_name) LIKE :search_query"

        # Validate sort column
        valid_sort_cols = ['spend', 'impressions', 'clicks', 'purchases', 'purchase_value']
        if sort_by not in valid_sort_cols:
            sort_by = 'spend'

        # Validate sort direction
        sort_direction = sort_direction.upper()
        if sort_direction not in ['ASC', 'DESC']:
            sort_direction = 'DESC'

        query = text(f"""
            SELECT
                c.campaign_id,
                c.campaign_name,
                c.campaign_status,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_campaign c ON f.campaign_id = c.campaign_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {status_filter}
                {search_filter}
            GROUP BY c.campaign_id, c.campaign_name, c.campaign_status
            ORDER BY {sort_by} {sort_direction}
            LIMIT :limit
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            'limit': limit
        }
        
        if search_query:
            params['search_query'] = f"%{search_query.lower()}%"

        # Add status params
        if campaign_status and campaign_status != ['ALL']:
            for i, status in enumerate(campaign_status):
                params[f'status_{i}'] = status

        results = self.db.execute(query, params).fetchall()

        campaigns = []
        for row in results:
            campaigns.append({
                'campaign_id': int(row.campaign_id),
                'campaign_name': str(row.campaign_name),
                'campaign_status': str(row.campaign_status),
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'purchases': int(row.purchases or 0),
                'purchase_value': float(row.purchase_value or 0)
            })

        return campaigns

    def get_time_series(
        self,
        start_date: date,
        end_date: date,
        granularity: str = "day",
        campaign_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get time series metrics data.

        Args:
            start_date: Start date
            end_date: End date
            granularity: day, week, or month
            campaign_id: Optional filter by campaign

        Returns:
            List of time series data points
        """
        # Determine date truncation based on granularity
        if granularity == "week":
            date_trunc = "DATE_TRUNC('week', d.date)"
        elif granularity == "month":
            date_trunc = "DATE_TRUNC('month', d.date)"
        else:
            date_trunc = "d.date"

        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        query = text(f"""
            SELECT
                {date_trunc}::date as date,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {campaign_filter}
            GROUP BY {date_trunc}
            ORDER BY date ASC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date
        }

        if campaign_id is not None:
            params['campaign_id'] = campaign_id

        results = self.db.execute(query, params).fetchall()

        time_series = []
        for row in results:
            time_series.append({
                'date': row.date.strftime('%Y-%m-%d'),
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'purchases': int(row.purchases or 0),
                'purchase_value': float(row.purchase_value or 0)
            })

        return time_series

    def get_age_gender_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        group_by: str = 'both'
    ) -> List[Dict[str, Any]]:
        """
        Get age and gender breakdown metrics.

        Args:
            start_date: Start date
            end_date: End date
            campaign_id: Optional filter by campaign
            group_by: 'age', 'gender', or 'both'

        Returns:
            List of age/gender breakdowns
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        # Determine grouping
        group_cols = []
        if group_by == 'age':
            group_cols = ['a.age_group']
            select_cols = 'a.age_group, \'All\' as gender'
        elif group_by == 'gender':
            group_cols = ['g.gender']
            select_cols = '\'All\' as age_group, g.gender'
        else: # both
            group_cols = ['a.age_group', 'g.gender']
            select_cols = 'a.age_group, g.gender'

        group_by_str = ', '.join(group_cols)

        query = text(f"""
            SELECT
                {select_cols},
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks
            FROM fact_age_gender_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_age a ON f.age_id = a.age_id
            JOIN dim_gender g ON f.gender_id = g.gender_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {campaign_filter}
            GROUP BY {group_by_str}
            ORDER BY spend DESC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date
        }

        if campaign_id is not None:
            params['campaign_id'] = campaign_id

        results = self.db.execute(query, params).fetchall()

        breakdowns = []
        for row in results:
            breakdowns.append({
                'age_group': str(row.age_group),
                'gender': str(row.gender),
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0)
            })

        return breakdowns

    def get_placement_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get placement breakdown metrics.

        Args:
            start_date: Start date
            end_date: End date
            campaign_id: Optional filter by campaign

        Returns:
            List of placement breakdowns
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        query = text(f"""
            SELECT
                p.placement_name,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks
            FROM fact_placement_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_placement p ON f.placement_id = p.placement_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {campaign_filter}
            GROUP BY p.placement_name
            ORDER BY spend DESC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date
        }

        if campaign_id is not None:
            params['campaign_id'] = campaign_id

        results = self.db.execute(query, params).fetchall()

        breakdowns = []
        for row in results:
            breakdowns.append({
                'placement_name': str(row.placement_name),
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0)
            })

        return breakdowns

    def get_platform_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get platform breakdown metrics (derived from placement_name).
        
        Args:
            start_date: Start date
            end_date: End date
            campaign_id: Optional filter by campaign
            
        Returns:
            List of platform breakdowns
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        # Use SPLIT_PART to extract platform from 'Facebook Feed' -> 'Facebook'
        query = text(f"""
            SELECT
                SPLIT_PART(p.placement_name, ' ', 1) as platform,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks
            FROM fact_placement_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_placement p ON f.placement_id = p.placement_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {campaign_filter}
            GROUP BY platform
            ORDER BY spend DESC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date
        }

        if campaign_id is not None:
            params['campaign_id'] = campaign_id

        results = self.db.execute(query, params).fetchall()

        breakdowns = []
        for row in results:
            breakdowns.append({
                'platform': str(row.platform).capitalize(), 
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0)
            })

        return breakdowns

    def get_creative_metrics(
        self,
        start_date: date,
        end_date: date,
        is_video: Optional[bool] = None,
        min_spend: float = 0
    ) -> List[Dict[str, Any]]:
        """
        Get creative-level metrics.

        Args:
            start_date: Start date
            end_date: End date
            is_video: Optional filter for video/image creatives
            min_spend: Minimum spend threshold

        Returns:
            List of creative metrics
        """
        video_filter = ""
        if is_video is not None:
            video_filter = "AND cr.is_video = :is_video"

        query = text(f"""
            SELECT
                cr.creative_id,
                cr.title,
                cr.body,
                cr.is_video,
                cr.video_length_seconds,
                cr.image_url,
                cr.video_url,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value,
                SUM(f.video_plays) as video_plays,
                SUM(f.video_p25_watched) as video_p25_watched,
                SUM(f.video_p50_watched) as video_p50_watched,
                SUM(f.video_p75_watched) as video_p75_watched,
                SUM(f.video_p100_watched) as video_p100_watched,
                CASE WHEN SUM(f.video_plays) > 0 
                     THEN SUM(f.video_avg_time_watched * f.video_plays) / SUM(f.video_plays) 
                     ELSE 0 END as video_avg_time_watched
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_creative cr ON f.creative_id = cr.creative_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {video_filter}
            GROUP BY cr.creative_id, cr.title, cr.body, cr.is_video,
                     cr.video_length_seconds, cr.image_url, cr.video_url
            HAVING SUM(f.spend) >= :min_spend
            ORDER BY spend DESC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            'min_spend': min_spend
        }

        if is_video is not None:
            params['is_video'] = is_video

        results = self.db.execute(query, params).fetchall()

        creatives = []
        for row in results:
            creatives.append({
                'creative_id': int(row.creative_id),
                'title': str(row.title) if row.title else None,
                'body': str(row.body) if row.body else None,
                'is_video': bool(row.is_video),
                'video_length_seconds': int(row.video_length_seconds) if row.video_length_seconds else None,
                'image_url': str(row.image_url) if row.image_url else None,
                'video_url': str(row.video_url) if row.video_url else None,
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'purchases': int(row.purchases or 0),
                'purchase_value': float(row.purchase_value or 0),
                'video_plays': int(row.video_plays or 0),
                'video_p25_watched': int(row.video_p25_watched or 0),
                'video_p50_watched': int(row.video_p50_watched or 0),
                'video_p75_watched': int(row.video_p75_watched or 0),
                'video_p100_watched': int(row.video_p100_watched or 0),
                'video_avg_time_watched': float(row.video_avg_time_watched or 0)
            })

        return creatives

    def get_adset_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get adset-level metrics and targeting info.
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        query = text(f"""
            SELECT
                a.adset_id,
                a.adset_name,
                a.targeting_type,
                a.targeting_summary,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_adset a ON f.adset_id = a.adset_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {campaign_filter}
            GROUP BY a.adset_id, a.adset_name, a.targeting_type, a.targeting_summary
            ORDER BY spend DESC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date
        }

        if campaign_id is not None:
            params['campaign_id'] = campaign_id

        results = self.db.execute(query, params).fetchall()

        adsets = []
        for row in results:
            adsets.append({
                'adset_id': int(row.adset_id),
                'adset_name': str(row.adset_name),
                'targeting_type': str(row.targeting_type or 'Broad'),
                'targeting_summary': str(row.targeting_summary or 'N/A'),
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'purchases': int(row.purchases or 0),
                'purchase_value': float(row.purchase_value or 0)
            })

        return adsets

    def get_country_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        top_n: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get country breakdown metrics.

        Args:
            start_date: Start date
            end_date: End date
            campaign_id: Optional filter by campaign
            top_n: Number of top countries to return

        Returns:
            List of country breakdowns
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        query = text(f"""
            SELECT
                c.country,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks
            FROM fact_country_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_country c ON f.country_id = c.country_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {campaign_filter}
            GROUP BY c.country
            ORDER BY spend DESC
            LIMIT :top_n
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            'top_n': top_n
        }

        if campaign_id is not None:
            params['campaign_id'] = campaign_id

        results = self.db.execute(query, params).fetchall()

        breakdowns = []
        for row in results:
            breakdowns.append({
                'country': str(row.country),
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0)
            })

        return breakdowns

    def get_creative_detail(
        self,
        creative_id: int,
        start_date: date,
        end_date: date
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed metrics for a single creative.

        Args:
            creative_id: Creative ID
            start_date: Start date
            end_date: End date

        Returns:
            Creative detail dict or None if not found
        """
        # Get creative info and aggregated metrics
        query = text(f"""
            SELECT
                cr.creative_id,
                cr.title,
                cr.body,
                cr.is_video,
                cr.video_length_seconds,
                cr.image_url,
                cr.video_url,
                cr.call_to_action_type,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value,
                SUM(f.video_plays) as video_plays,
                SUM(f.video_p25_watched) as video_p25_watched,
                SUM(f.video_p50_watched) as video_p50_watched,
                SUM(f.video_p75_watched) as video_p75_watched,
                SUM(f.video_p100_watched) as video_p100_watched,
                CASE WHEN SUM(f.video_plays) > 0 
                     THEN SUM(f.video_avg_time_watched * f.video_plays) / SUM(f.video_plays) 
                     ELSE 0 END as video_avg_time_watched
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_creative cr ON f.creative_id = cr.creative_id
            WHERE cr.creative_id = :creative_id
                AND d.date >= :start_date
                AND d.date <= :end_date
            GROUP BY cr.creative_id, cr.title, cr.body, cr.is_video,
                     cr.video_length_seconds, cr.image_url, cr.video_url,
                     cr.call_to_action_type
        """)

        result = self.db.execute(query, {
            'creative_id': creative_id,
            'start_date': start_date,
            'end_date': end_date
        }).fetchone()

        if not result:
            return None

        # Get daily trend for this creative
        trend_query = text("""
            SELECT
                d.date,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                SUM(f.video_plays) as video_plays,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            WHERE f.creative_id = :creative_id
                AND d.date >= :start_date
                AND d.date <= :end_date
            GROUP BY d.date
            ORDER BY d.date ASC
        """)

        trend_results = self.db.execute(trend_query, {
            'creative_id': creative_id,
            'start_date': start_date,
            'end_date': end_date
        }).fetchall()

        trend = []
        for row in trend_results:
            trend.append({
                'date': row.date.strftime('%Y-%m-%d'),
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'video_plays': int(row.video_plays or 0),
                'purchases': int(row.purchases or 0),
                'purchase_value': float(row.purchase_value or 0)
            })

        return {
            'creative_id': int(result.creative_id),
            'title': str(result.title) if result.title else None,
            'body': str(result.body) if result.body else None,
            'is_video': bool(result.is_video),
            'video_length_seconds': int(result.video_length_seconds) if result.video_length_seconds else None,
            'image_url': str(result.image_url) if result.image_url else None,
            'video_url': str(result.video_url) if result.video_url else None,
            'call_to_action_type': str(result.call_to_action_type) if result.call_to_action_type else None,
            'spend': float(result.spend or 0),
            'impressions': int(result.impressions or 0),
            'clicks': int(result.clicks or 0),
            'purchases': int(result.purchases or 0),
            'purchase_value': float(result.purchase_value or 0),
            'video_plays': int(result.video_plays or 0),
            'video_p25_watched': int(result.video_p25_watched or 0),
            'video_p50_watched': int(result.video_p50_watched or 0),
            'video_p75_watched': int(result.video_p75_watched or 0),
            'video_p100_watched': int(result.video_p100_watched or 0),
            'video_avg_time_watched': float(result.video_avg_time_watched or 0),
            'trend': trend
        }

    def get_creative_comparison(
        self,
        creative_ids: List[int],
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """
        Get metrics for multiple creatives for comparison.

        Args:
            creative_ids: List of creative IDs (2-5)
            start_date: Start date
            end_date: End date

        Returns:
            List of creative metrics dicts
        """
        if not creative_ids or len(creative_ids) < 2:
            return []

        # Build IN clause
        placeholders = ', '.join([f':id_{i}' for i in range(len(creative_ids))])

        query = text(f"""
            SELECT
                cr.creative_id,
                cr.title,
                cr.is_video,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value,
                SUM(f.video_plays) as video_plays,
                SUM(f.video_p25_watched) as video_p25_watched,
                SUM(f.video_p100_watched) as video_p100_watched,
                CASE WHEN SUM(f.video_plays) > 0 
                     THEN SUM(f.video_avg_time_watched * f.video_plays) / SUM(f.video_plays) 
                     ELSE 0 END as video_avg_time_watched
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_creative cr ON f.creative_id = cr.creative_id
            WHERE cr.creative_id IN ({placeholders})
                AND d.date >= :start_date
                AND d.date <= :end_date
            GROUP BY cr.creative_id, cr.title, cr.is_video
            ORDER BY spend DESC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date
        }

        # Add creative IDs to params
        for i, creative_id in enumerate(creative_ids):
            params[f'id_{i}'] = creative_id

        results = self.db.execute(query, params).fetchall()

        creatives = []
        for row in results:
            creatives.append({
                'creative_id': int(row.creative_id),
                'title': str(row.title) if row.title else f"Creative {row.creative_id}",
                'is_video': bool(row.is_video),
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'purchases': int(row.purchases or 0),
                'purchase_value': float(row.purchase_value or 0),
                'video_plays': int(row.video_plays or 0),
                'video_p25_watched': int(row.video_p25_watched or 0),
                'video_p100_watched': int(row.video_p100_watched or 0)
            })

        return creatives

    def get_video_insights(
        self,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Get video performance insights and patterns.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            Dict with video insights
        """
        # Get overall video metrics
        query = text("""
            SELECT
                AVG(CASE WHEN f.video_plays > 0
                    THEN (f.video_p25_watched::float / f.video_plays) * 100
                    ELSE 0 END) as avg_hook_rate,
                AVG(CASE WHEN f.video_plays > 0
                    THEN (f.video_p100_watched::float / f.video_plays) * 100
                    ELSE 0 END) as avg_completion_rate,
                AVG(CASE WHEN f.video_plays > 0
                    THEN (f.video_p50_watched::float / f.video_plays) * 100
                    ELSE 0 END) as avg_hold_rate
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_creative cr ON f.creative_id = cr.creative_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                AND cr.is_video = true
                AND f.video_plays > 0
        """)

        result = self.db.execute(query, {
            'start_date': start_date,
            'end_date': end_date
        }).fetchone()

        # Get top performing videos
        top_videos_query = text("""
            SELECT
                cr.creative_id,
                cr.title,
                cr.video_length_seconds,
                SUM(f.spend) as spend,
                SUM(f.video_plays) as video_plays,
                SUM(f.video_p25_watched) as video_p25_watched,
                SUM(f.video_p100_watched) as video_p100_watched,
                CASE WHEN SUM(f.video_plays) > 0
                    THEN (SUM(f.video_p25_watched)::float / SUM(f.video_plays)) * 100
                    ELSE 0 END as hook_rate,
                CASE WHEN SUM(f.video_plays) > 0
                    THEN (SUM(f.video_p100_watched)::float / SUM(f.video_plays)) * 100
                    ELSE 0 END as completion_rate
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_creative cr ON f.creative_id = cr.creative_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                AND cr.is_video = true
                AND f.video_plays > 0
            GROUP BY cr.creative_id, cr.title, cr.video_length_seconds
            HAVING SUM(f.spend) >= 100
            ORDER BY hook_rate DESC
            LIMIT 5
        """)

        top_videos = self.db.execute(top_videos_query, {
            'start_date': start_date,
            'end_date': end_date
        }).fetchall()

        top_videos_list = []
        for row in top_videos:
            top_videos_list.append({
                'creative_id': int(row.creative_id),
                'title': str(row.title) if row.title else f"Video {row.creative_id}",
                'video_length_seconds': int(row.video_length_seconds) if row.video_length_seconds else None,
                'spend': float(row.spend or 0),
                'video_plays': int(row.video_plays or 0),
                'hook_rate': float(row.hook_rate or 0),
                'completion_rate': float(row.completion_rate or 0)
            })

        return {
            'avg_hook_rate': float(result.avg_hook_rate or 0) if result else 0.0,
            'avg_completion_rate': float(result.avg_completion_rate or 0) if result else 0.0,
            'avg_hold_rate': float(result.avg_hold_rate or 0) if result else 0.0,
            'top_videos': top_videos_list
        }

    def _empty_metrics(self) -> Dict[str, Any]:
        """Return empty metrics dict"""
        return {
            'spend': 0.0,
            'impressions': 0,
            'clicks': 0,
            'purchases': 0,
            'purchase_value': 0.0,
            'leads': 0,
            'add_to_cart': 0,
            'video_plays': 0,
            'video_p25_watched': 0,
            'video_p50_watched': 0,
            'video_p75_watched': 0,
            'video_p100_watched': 0
        }
