from datetime import date
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from backend.api.repositories.base_repository import BaseRepository

class CreativeRepository(BaseRepository):
    """Repository for creative-level metrics."""

    def get_creative_metrics(
        self,
        start_date: date,
        end_date: date,
        is_video: Optional[bool] = None,
        min_spend: float = 0,
        search_query: Optional[str] = None,
        ad_status: Optional[str] = None,
        campaign_name: Optional[str] = None,
        account_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get creative-level metrics.
        """
        video_filter = ""
        if is_video is not None:
            video_filter = "AND cr.is_video = :is_video"

        search_filter = ""
        if search_query:
            search_filter = "AND LOWER(cr.title) LIKE LOWER(:search_query)"

        status_filter = ""
        if ad_status:
            status_filter = "AND ad.ad_status = :ad_status"

        campaign_filter = ""
        if campaign_name:
            campaign_filter = "AND campaign.campaign_name = :campaign_name"

        account_filter = ""
        params = {
            'start_date': start_date,
            'end_date': end_date,
            'min_spend': min_spend
        }

        if account_ids is not None:
            if account_ids:
                # Build IN clause for accounts
                placeholders = ', '.join([f':acc_id_{i}' for i in range(len(account_ids))])
                account_filter = f"AND f.account_id IN ({placeholders})"

                # Add parameters
                for i, acc_id in enumerate(account_ids):
                    params[f'acc_id_{i}'] = acc_id
            else:
                 # Explicit empty list means no accounts allowed
                 account_filter = "AND 1=0"

        if is_video is not None:
            params['is_video'] = is_video

        if search_query:
            params['search_query'] = f'%{search_query}%'

        if ad_status:
            params['ad_status'] = ad_status

        if campaign_name:
            params['campaign_name'] = campaign_name

        query = text(f"""
            SELECT
                cr.creative_id,
                cr.title,
                cr.body,
                cr.is_video,
                COALESCE(cr.is_carousel, FALSE) as is_carousel,
                cr.video_length_seconds,
                cr.image_url,
                cr.video_url,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                COALESCE(SUM(conv.action_count), 0) as conversions,
                COALESCE(SUM(conv.action_value), 0) as conversion_value,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value,
                SUM(f.video_plays) as video_plays,
                SUM(f.video_p25_watched) as video_p25_watched,
                SUM(f.video_p50_watched) as video_p50_watched,
                SUM(f.video_p75_watched) as video_p75_watched,
                SUM(f.video_p100_watched) as video_p100_watched,
                CASE WHEN SUM(f.video_plays) > 0
                     THEN SUM(f.video_avg_time_watched * f.video_plays) / SUM(f.video_plays)
                     ELSE 0 END as video_avg_time_watched,
                ad.ad_status,
                adset.adset_status,
                campaign.campaign_status,
                CASE
                    WHEN ad.ad_status = 'ACTIVE'
                        AND adset.adset_status = 'ACTIVE'
                        AND campaign.campaign_status = 'ACTIVE'
                    THEN 'ACTIVE'
                    WHEN campaign.campaign_status = 'PAUSED' THEN 'PAUSED'
                    WHEN adset.adset_status = 'PAUSED' THEN 'PAUSED'
                    WHEN ad.ad_status = 'PAUSED' THEN 'PAUSED'
                    ELSE COALESCE(ad.ad_status, 'UNKNOWN')
                END as effective_status
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_creative cr ON f.creative_id = cr.creative_id
            JOIN dim_ad ad ON f.ad_id = ad.ad_id
            JOIN dim_adset adset ON ad.adset_id = adset.adset_id
            JOIN dim_campaign campaign ON adset.campaign_id = campaign.campaign_id
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
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {video_filter}
                {search_filter}
                {status_filter}
                {campaign_filter}
                {account_filter}
            GROUP BY cr.creative_id, cr.title, cr.body, cr.is_video, cr.is_carousel,
                     cr.video_length_seconds, cr.image_url, cr.video_url,
                     ad.ad_status, adset.adset_status, campaign.campaign_status
            HAVING SUM(f.spend) >= :min_spend
            ORDER BY spend DESC
        """)

        results = self.db.execute(query, params).fetchall()

        creatives = []
        for row in results:
            creatives.append({
                'creative_id': int(row.creative_id),
                'title': str(row.title) if row.title else None,
                'body': str(row.body) if row.body else None,
                'is_video': bool(row.is_video),
                'is_carousel': bool(row.is_carousel) if hasattr(row, 'is_carousel') else False,
                'video_length_seconds': int(row.video_length_seconds) if row.video_length_seconds else None,
                'image_url': str(row.image_url) if row.image_url else None,
                'video_url': str(row.video_url) if row.video_url else None,
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'conversions': int(row.conversions or 0),
                'conversion_value': float(row.conversion_value or 0),
                'purchases': int(row.purchases or 0),
                'purchase_value': float(row.purchase_value or 0),
                'video_plays': int(row.video_plays or 0),
                'video_p25_watched': int(row.video_p25_watched or 0),
                'video_p50_watched': int(row.video_p50_watched or 0),
                'video_p75_watched': int(row.video_p75_watched or 0),
                'video_p100_watched': int(row.video_p100_watched or 0),
                'video_avg_time_watched': float(row.video_avg_time_watched or 0),
                'ad_status': str(row.ad_status) if row.ad_status else None,
                'adset_status': str(row.adset_status) if row.adset_status else None,
                'campaign_status': str(row.campaign_status) if row.campaign_status else None,
                'effective_status': str(row.effective_status)
            })

        return creatives

    def get_creative_detail(
        self,
        creative_id: int,
        start_date: date,
        end_date: date,
        account_ids: Optional[List[int]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed metrics for a single creative.
        """
        # Get creative info and aggregated metrics
        query = text(f"""
            SELECT
                cr.creative_id,
                cr.title,
                cr.body,
                cr.is_video,
                COALESCE(cr.is_carousel, FALSE) as is_carousel,
                cr.video_length_seconds,
                cr.image_url,
                cr.video_url,
                cr.call_to_action_type,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                COALESCE(SUM(conv.action_count), 0) as conversions,
                COALESCE(SUM(conv.action_value), 0) as conversion_value,
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
            WHERE cr.creative_id = :creative_id
                AND d.date >= :start_date
                AND d.date <= :end_date
                {account_filter}
            GROUP BY cr.creative_id, cr.title, cr.body, cr.is_video, cr.is_carousel,
                     cr.video_length_seconds, cr.image_url, cr.video_url,
                     cr.call_to_action_type
        """)

        params = {
            'creative_id': creative_id,
            'start_date': start_date,
            'end_date': end_date
        }

        # Build account filter
        account_filter = ""
        if account_ids is not None:
            if account_ids:
                acc_placeholders = ', '.join([f':acc_id_{i}' for i in range(len(account_ids))])
                account_filter = f"AND f.account_id IN ({acc_placeholders})"
                for i, acc_id in enumerate(account_ids):
                    params[f'acc_id_{i}'] = acc_id
            else:
                account_filter = "AND 1=0"

        result = self.db.execute(query.format(account_filter=account_filter), params).fetchone()

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
                COALESCE(SUM(conv.action_count), 0) as conversions,
                COALESCE(SUM(conv.action_value), 0) as conversion_value
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            LEFT JOIN (
                SELECT date_id, account_id, creative_id,
                       SUM(action_count) as action_count,
                       SUM(action_value) as action_value
                FROM fact_action_metrics fam
                JOIN dim_action_type dat ON fam.action_type_id = dat.action_type_id
                WHERE dat.is_conversion = TRUE
                GROUP BY 1, 2, 3
            ) conv ON f.date_id = conv.date_id 
                  AND f.account_id = conv.account_id 
                  AND f.creative_id = conv.creative_id
            WHERE f.creative_id = :creative_id
                AND d.date >= :start_date
                AND d.date <= :end_date
                {account_filter}
            GROUP BY d.date
            ORDER BY d.date ASC
        """)

        trend_results = self.db.execute(trend_query.format(account_filter=account_filter), params).fetchall()

        trend = []
        for row in trend_results:
            trend.append({
                'date': row.date.strftime('%Y-%m-%d'),
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'video_plays': int(row.video_plays or 0),
                'conversions': int(row.conversions or 0),
                'conversion_value': float(row.conversion_value or 0)
            })

        return {
            'creative_id': int(result.creative_id),
            'title': str(result.title) if result.title else None,
            'body': str(result.body) if result.body else None,
            'is_video': bool(result.is_video),
            'is_carousel': bool(result.is_carousel) if hasattr(result, 'is_carousel') else False,
            'video_length_seconds': int(result.video_length_seconds) if result.video_length_seconds else None,
            'image_url': str(result.image_url) if result.image_url else None,
            'video_url': str(result.video_url) if result.video_url else None,
            'call_to_action_type': str(result.call_to_action_type) if result.call_to_action_type else None,
            'spend': float(result.spend or 0),
            'impressions': int(result.impressions or 0),
            'clicks': int(result.clicks or 0),
            'conversions': int(result.conversions or 0),
            'conversion_value': float(result.conversion_value or 0),
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
        end_date: date,
        account_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get metrics for multiple creatives for comparison.
        """
        if not creative_ids or len(creative_ids) < 2:
            return []

        # Build IN clause
        placeholders = ', '.join([f':id_{i}' for i in range(len(creative_ids))])

        # Build account filter BEFORE using it in query
        account_filter = ""
        params = {
            'start_date': start_date,
            'end_date': end_date
        }

        if account_ids is not None:
            if account_ids:
                acc_placeholders = ', '.join([f':acc_id_{i}' for i in range(len(account_ids))])
                account_filter = f"AND f.account_id IN ({acc_placeholders})"
                for i, acc_id in enumerate(account_ids):
                    params[f'acc_id_{i}'] = acc_id
            else:
                account_filter = "AND 1=0"

        # Add creative IDs to params
        for i, creative_id in enumerate(creative_ids):
            params[f'id_{i}'] = creative_id

        query = text(f"""
            SELECT
                cr.creative_id,
                cr.title,
                cr.is_video,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                COALESCE(SUM(conv.action_count), 0) as conversions,
                COALESCE(SUM(conv.action_value), 0) as conversion_value,
                SUM(f.video_plays) as video_plays,
                SUM(f.video_p25_watched) as video_p25_watched,
                SUM(f.video_p100_watched) as video_p100_watched,
                CASE WHEN SUM(f.video_plays) > 0
                     THEN SUM(f.video_avg_time_watched * f.video_plays) / SUM(f.video_plays)
                     ELSE 0 END as video_avg_time_watched
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_creative cr ON f.creative_id = cr.creative_id
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
            WHERE cr.creative_id IN ({placeholders})
                AND d.date >= :start_date
                AND d.date <= :end_date
                {account_filter}
            GROUP BY cr.creative_id, cr.title, cr.is_video
            ORDER BY spend DESC
        """)

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
                'conversions': int(row.conversions or 0),
                'conversion_value': float(row.conversion_value or 0),
                'video_plays': int(row.video_plays or 0),
                'video_p25_watched': int(row.video_p25_watched or 0),
                'video_p100_watched': int(row.video_p100_watched or 0)
            })

        return creatives

    def get_video_insights(
        self,
        start_date: date,
        end_date: date,
        account_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Get video performance insights and patterns.
        """
        params = {
            'start_date': start_date,
            'end_date': end_date
        }

        account_filter = ""
        if account_ids is not None:
            if account_ids:
                acc_placeholders = ', '.join([f':acc_id_{i}' for i in range(len(account_ids))])
                account_filter = f"AND f.account_id IN ({acc_placeholders})"
                for i, acc_id in enumerate(account_ids):
                    params[f'acc_id_{i}'] = acc_id
            else:
                account_filter = "AND 1=0"

        # Get overall video metrics
        query = text(f"""
            SELECT
                AVG(CASE WHEN f.video_plays > 0
                    THEN (f.video_p25_watched::float / f.video_plays) * 100
                    ELSE 0 END) as avg_hook_rate,
                AVG(CASE WHEN f.video_plays > 0
                    THEN (f.video_p100_watched::float / f.video_plays) * 100
                    ELSE 0 END) as avg_completion_rate,
                AVG(CASE WHEN f.video_plays > 0
                    THEN (f.video_p50_watched::float / f.video_plays) * 100
                    ELSE 0 END) as avg_hold_rate,
                AVG(CASE WHEN f.video_plays > 0
                    THEN f.video_avg_time_watched
                    ELSE 0 END) as avg_video_time
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_creative cr ON f.creative_id = cr.creative_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                AND cr.is_video = true
                AND f.video_plays > 0
                {account_filter}
        """)

        result = self.db.execute(query, params).fetchone()

        # Get top performing videos
        top_videos_query = text(f"""
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
                {account_filter}
            GROUP BY cr.creative_id, cr.title, cr.video_length_seconds
            HAVING SUM(f.spend) >= 100
            ORDER BY hook_rate DESC
            LIMIT 5
        """)

        top_videos = self.db.execute(top_videos_query, params).fetchall()

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
            'avg_video_time': float(result.avg_video_time or 0) if result else 0.0,
            'top_videos': top_videos_list
        }
