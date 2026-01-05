"""
Data access layer for creative performance analysis.

This module provides queries for analyzing creative themes, CTA effectiveness,
ad fatigue detection, and creative performance patterns.
"""

from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from backend.api.repositories.base_repository import BaseRepository


class CreativeAnalysisRepository(BaseRepository):
    """Repository for creative performance and pattern analysis"""

    def get_creative_performance(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        account_ids: Optional[List[int]] = None,
        min_impressions: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Get creative performance with metadata (titles, bodies, CTAs).

        Args:
            start_date: Start date for analysis
            end_date: End date for analysis
            campaign_id: Optional campaign filter
            account_ids: Optional account filter
            min_impressions: Minimum impressions threshold (default 1000)

        Returns:
            List of dicts with creative metadata and performance metrics
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
                cr.creative_id,
                cr.title,
                cr.body,
                cr.call_to_action_type,
                cr.is_video,
                cr.video_length_seconds,
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
                     ELSE 0 END as cpa,
                CASE WHEN SUM(f.video_plays) > 0 AND cr.is_video = TRUE
                     THEN (SUM(f.video_p25_watched)::float / SUM(f.video_plays)) * 100
                     ELSE 0 END as hook_rate,
                CASE WHEN SUM(f.video_plays) > 0 AND cr.is_video = TRUE
                     THEN (SUM(f.video_p100_watched)::float / SUM(f.video_plays)) * 100
                     ELSE 0 END as completion_rate
            FROM dim_creative cr
            JOIN fact_core_metrics f ON cr.creative_id = f.creative_id
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
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {campaign_filter}
                {account_filter}
            GROUP BY cr.creative_id, cr.title, cr.body, cr.call_to_action_type,
                     cr.is_video, cr.video_length_seconds
            HAVING SUM(f.impressions) >= :min_impressions
            ORDER BY CASE WHEN SUM(f.spend) > 0 AND SUM(f.purchases) > 0
                          THEN SUM(f.purchase_value) / SUM(f.spend)
                          ELSE 0 END DESC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            'min_impressions': min_impressions,
            **param_account_ids
        }
        if campaign_id:
            params['campaign_id'] = campaign_id

        result = self.db.execute(query, params).fetchall()

        return [
            {
                'creative_id': row.creative_id,
                'title': row.title or '',
                'body': row.body or '',
                'call_to_action_type': row.call_to_action_type or '',
                'is_video': row.is_video or False,
                'video_length_seconds': row.video_length_seconds or 0,
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
                'hook_rate': float(row.hook_rate or 0),
                'completion_rate': float(row.completion_rate or 0)
            }
            for row in result
        ]

    def get_cta_effectiveness(
        self,
        start_date: date,
        end_date: date,
        account_ids: Optional[List[int]] = None,
        min_creatives: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Analyze CTA type effectiveness.

        Args:
            start_date: Start date for analysis
            end_date: End date for analysis
            account_ids: Optional account filter
            min_creatives: Minimum creatives per CTA type (default 3)

        Returns:
            List of dicts with CTA performance metrics
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
                cr.call_to_action_type,
                COUNT(DISTINCT cr.creative_id) as creative_count,
                SUM(f.spend) as total_spend,
                SUM(f.impressions) as total_impressions,
                SUM(f.clicks) as total_clicks,
                COALESCE(SUM(conv.action_count), 0) as total_conversions,
                SUM(f.purchases) as total_purchases,
                SUM(f.purchase_value) as total_purchase_value,
                AVG(CASE WHEN f.impressions > 0
                         THEN (f.clicks::float / f.impressions) * 100
                         ELSE 0 END) as avg_ctr,
                AVG(CASE WHEN f.spend > 0 AND f.purchases > 0
                         THEN f.purchase_value / f.spend
                         ELSE 0 END) as avg_roas,
                AVG(CASE WHEN conv.action_count > 0
                         THEN f.spend / conv.action_count
                         ELSE 0 END) as avg_cpa
            FROM dim_creative cr
            JOIN fact_core_metrics f ON cr.creative_id = f.creative_id
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
                AND cr.call_to_action_type IS NOT NULL
                AND cr.call_to_action_type != ''
                {account_filter}
            GROUP BY cr.call_to_action_type
            HAVING COUNT(DISTINCT cr.creative_id) >= :min_creatives
            ORDER BY avg_roas DESC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            'min_creatives': min_creatives,
            **param_account_ids
        }

        result = self.db.execute(query, params).fetchall()

        return [
            {
                'cta_type': row.call_to_action_type,
                'creative_count': int(row.creative_count or 0),
                'total_spend': float(row.total_spend or 0),
                'total_impressions': int(row.total_impressions or 0),
                'total_clicks': int(row.total_clicks or 0),
                'total_conversions': int(row.total_conversions or 0),
                'total_purchases': int(row.total_purchases or 0),
                'total_purchase_value': float(row.total_purchase_value or 0),
                'avg_ctr': float(row.avg_ctr or 0),
                'avg_roas': float(row.avg_roas or 0),
                'avg_cpa': float(row.avg_cpa or 0)
            }
            for row in result
        ]

    def detect_creative_fatigue(
        self,
        creative_id: int,
        lookback_days: int = 30
    ) -> Dict[str, Any]:
        """
        Detect ad fatigue by tracking CTR decline over time.

        Args:
            creative_id: Creative to analyze
            lookback_days: Days to look back (default 30)

        Returns:
            Dict with daily CTR data and fatigue metrics
        """
        query = text(f"""
            WITH daily_ctr AS (
                SELECT
                    d.date,
                    CASE WHEN SUM(f.impressions) > 0
                         THEN (SUM(f.clicks)::float / SUM(f.impressions)) * 100
                         ELSE 0 END as ctr,
                    SUM(f.impressions) as impressions
                FROM fact_core_metrics f
                JOIN dim_date d ON f.date_id = d.date_id
                WHERE f.creative_id = :creative_id
                    AND d.date >= CURRENT_DATE - INTERVAL '{lookback_days} days'
                GROUP BY d.date
            ),
            ctr_with_avg AS (
                SELECT
                    date,
                    ctr,
                    impressions,
                    AVG(ctr) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as ctr_7day_avg,
                    FIRST_VALUE(ctr) OVER (ORDER BY date) as initial_ctr,
                    LAST_VALUE(ctr) OVER (ORDER BY date ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING) as latest_ctr
                FROM daily_ctr
            )
            SELECT
                date,
                ctr,
                impressions,
                ctr_7day_avg,
                initial_ctr,
                latest_ctr,
                CASE WHEN initial_ctr > 0
                     THEN ((ctr_7day_avg - initial_ctr) / initial_ctr) * 100
                     ELSE 0 END as fatigue_pct
            FROM ctr_with_avg
            ORDER BY date
        """)

        result = self.db.execute(query, {'creative_id': creative_id}).fetchall()

        if not result:
            return {
                'creative_id': creative_id,
                'has_data': False,
                'daily_data': [],
                'fatigue_detected': False,
                'fatigue_pct': 0
            }

        daily_data = [
            {
                'date': row.date.isoformat() if row.date else None,
                'ctr': float(row.ctr or 0),
                'impressions': int(row.impressions or 0),
                'ctr_7day_avg': float(row.ctr_7day_avg or 0),
                'fatigue_pct': float(row.fatigue_pct or 0)
            }
            for row in result
        ]

        # Check if fatigue detected (>20% decline)
        latest = result[-1] if result else None
        fatigue_detected = latest and latest.fatigue_pct < -20

        return {
            'creative_id': creative_id,
            'has_data': True,
            'daily_data': daily_data,
            'initial_ctr': float(result[0].initial_ctr or 0) if result else 0,
            'latest_ctr': float(result[-1].ctr_7day_avg or 0) if result else 0,
            'fatigue_pct': float(result[-1].fatigue_pct or 0) if result else 0,
            'fatigue_detected': fatigue_detected
        }

    def get_fatigued_creatives(
        self,
        lookback_days: int = 30,
        fatigue_threshold: float = -20.0,
        min_impressions: int = 5000
    ) -> List[Dict[str, Any]]:
        """
        Find all creatives showing signs of fatigue.

        Args:
            lookback_days: Days to analyze
            fatigue_threshold: CTR decline % threshold (default -20%)
            min_impressions: Minimum total impressions (default 5000)

        Returns:
            List of fatigued creatives with details
        """
        # Simpler approach: Get active creatives first, then check each for fatigue
        query = text(f"""
            SELECT
                f.creative_id,
                cr.title,
                cr.body,
                cr.call_to_action_type,
                SUM(f.impressions) as total_impressions
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_creative cr ON f.creative_id = cr.creative_id
            WHERE d.date >= CURRENT_DATE - INTERVAL '{lookback_days} days'
            GROUP BY f.creative_id, cr.title, cr.body, cr.call_to_action_type
            HAVING SUM(f.impressions) >= :min_impressions
            ORDER BY SUM(f.impressions) DESC
        """)

        result = self.db.execute(query, {
            'min_impressions': min_impressions
        }).fetchall()

        # Check each creative for fatigue
        fatigued_creatives = []
        for row in result:
            fatigue_data = self.detect_creative_fatigue(
                creative_id=row.creative_id,
                lookback_days=lookback_days
            )

            if (fatigue_data['has_data'] and
                fatigue_data['fatigue_pct'] <= fatigue_threshold):
                fatigued_creatives.append({
                    'creative_id': row.creative_id,
                    'title': row.title or '',
                    'body': row.body or '',
                    'call_to_action_type': row.call_to_action_type or '',
                    'total_impressions': int(row.total_impressions or 0),
                    'initial_ctr': fatigue_data['initial_ctr'],
                    'recent_ctr': fatigue_data['latest_ctr'],
                    'fatigue_pct': fatigue_data['fatigue_pct']
                })

        # Sort by fatigue percentage (most fatigued first)
        fatigued_creatives.sort(key=lambda x: x['fatigue_pct'])

        return fatigued_creatives
