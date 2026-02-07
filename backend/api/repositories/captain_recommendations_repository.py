"""
Repository for AI Captain historical recommendations.
Provides data-driven suggestions based on past campaign performance.
"""
import logging
from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from backend.api.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class CaptainRecommendationsRepository(BaseRepository):
    """Repository for fetching historical campaign data for AI Captain recommendations."""

    def get_top_age_groups(
        self,
        account_ids: List[int],
        lookback_days: int = 90,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get top performing age groups based on CTR and conversions.
        Returns age groups sorted by performance score.
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=lookback_days)

        placeholders, param_acc = self.build_in_clause(account_ids, 'acc_id')
        if not placeholders:
            return []

        query = text(f"""
            SELECT
                a.age_group,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                CASE WHEN SUM(f.impressions) > 0
                     THEN SUM(f.clicks)::float / SUM(f.impressions) * 100
                     ELSE 0 END as ctr
            FROM fact_age_gender_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_age a ON f.age_id = a.age_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                AND f.account_id IN ({placeholders})
            GROUP BY a.age_group
            HAVING SUM(f.spend) > 0
            ORDER BY ctr DESC, spend DESC
            LIMIT :limit
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            'limit': limit,
            **param_acc
        }

        results = self.db.execute(query, params).fetchall()

        age_groups = []
        for row in results:
            age_groups.append({
                'age_group': str(row.age_group),
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'ctr': round(float(row.ctr or 0), 2)
            })

        return age_groups

    def get_top_locations(
        self,
        account_ids: List[int],
        lookback_days: int = 90,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get top performing locations (countries) by spend and conversions.
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=lookback_days)

        placeholders, param_acc = self.build_in_clause(account_ids, 'acc_id')
        if not placeholders:
            return []

        query = text(f"""
            SELECT
                c.country,
                c.country_code,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks
            FROM fact_country_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_country c ON f.country_id = c.country_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                AND f.account_id IN ({placeholders})
            GROUP BY c.country, c.country_code
            HAVING SUM(f.spend) > 0
            ORDER BY spend DESC
            LIMIT :limit
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            'limit': limit,
            **param_acc
        }

        results = self.db.execute(query, params).fetchall()

        locations = []
        for row in results:
            locations.append({
                'country': str(row.country),
                'country_code': str(row.country_code) if row.country_code else None,
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0)
            })

        return locations

    def get_cta_performance(
        self,
        account_ids: List[int],
        lookback_days: int = 90,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get CTA button performance based on historical data.
        Returns CTAs sorted by usage and CTR.
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=lookback_days)

        placeholders, param_acc = self.build_in_clause(account_ids, 'acc_id')
        if not placeholders:
            return []

        query = text(f"""
            SELECT
                cr.call_to_action_type as cta,
                COUNT(DISTINCT f.ad_id) as usage_count,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                CASE WHEN SUM(f.impressions) > 0
                     THEN SUM(f.clicks)::float / SUM(f.impressions) * 100
                     ELSE 0 END as ctr
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_creative cr ON f.creative_id = cr.creative_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                AND f.account_id IN ({placeholders})
                AND cr.call_to_action_type IS NOT NULL
                AND cr.call_to_action_type != ''
            GROUP BY cr.call_to_action_type
            HAVING SUM(f.spend) > 0
            ORDER BY usage_count DESC, ctr DESC
            LIMIT :limit
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            'limit': limit,
            **param_acc
        }

        results = self.db.execute(query, params).fetchall()

        ctas = []
        for row in results:
            ctas.append({
                'cta': str(row.cta),
                'usage_count': int(row.usage_count or 0),
                'spend': float(row.spend or 0),
                'clicks': int(row.clicks or 0),
                'ctr': round(float(row.ctr or 0), 2)
            })

        return ctas

    def get_campaigns_for_clone(
        self,
        account_ids: List[int],
        lookback_days: int = 90,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get top campaigns with metrics for targeting clone.
        Returns campaigns sorted by spend with key metrics.
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=lookback_days)

        placeholders, param_acc = self.build_in_clause(account_ids, 'acc_id')
        if not placeholders:
            return []

        query = text(f"""
            SELECT
                c.campaign_id,
                c.campaign_name,
                c.objective,
                c.campaign_status,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value,
                CASE WHEN SUM(f.spend) > 0
                     THEN SUM(f.purchase_value) / SUM(f.spend)
                     ELSE 0 END as roas
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_campaign c ON f.campaign_id = c.campaign_id AND f.account_id = c.account_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                AND f.account_id IN ({placeholders})
            GROUP BY c.campaign_id, c.campaign_name, c.objective, c.campaign_status
            HAVING SUM(f.spend) > 10
            ORDER BY spend DESC
            LIMIT :limit
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            'limit': limit,
            **param_acc
        }

        results = self.db.execute(query, params).fetchall()

        campaigns = []
        for row in results:
            spend = float(row.spend or 0)
            clicks = int(row.clicks or 0)
            impressions = int(row.impressions or 0)

            campaigns.append({
                'campaign_id': str(row.campaign_id),
                'campaign_name': str(row.campaign_name),
                'objective': str(row.objective) if row.objective else None,
                'status': str(row.campaign_status) if row.campaign_status else None,
                'spend': spend,
                'impressions': impressions,
                'clicks': clicks,
                'roas': round(float(row.roas or 0), 2),
                'ctr': round((clicks / impressions * 100) if impressions > 0 else 0, 2)
            })

        return campaigns

    def get_ads_for_creative_clone(
        self,
        account_ids: List[int],
        lookback_days: int = 90,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get top ads with creative data for creative clone.
        Returns ads with headline, body, CTA, and thumbnail.
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=lookback_days)

        placeholders, param_acc = self.build_in_clause(account_ids, 'acc_id')
        if not placeholders:
            return []

        query = text(f"""
            SELECT
                ad.ad_id,
                ad.ad_name,
                cr.title,
                cr.body,
                cr.call_to_action_type as cta,
                cr.image_url,
                cr.is_video,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                CASE WHEN SUM(f.impressions) > 0
                     THEN SUM(f.clicks)::float / SUM(f.impressions) * 100
                     ELSE 0 END as ctr
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_ad ad ON f.ad_id = ad.ad_id
            JOIN dim_creative cr ON f.creative_id = cr.creative_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                AND f.account_id IN ({placeholders})
                AND (cr.title IS NOT NULL OR cr.body IS NOT NULL)
            GROUP BY ad.ad_id, ad.ad_name, cr.title, cr.body, cr.call_to_action_type, cr.image_url, cr.is_video
            HAVING SUM(f.spend) > 5
            ORDER BY ctr DESC, spend DESC
            LIMIT :limit
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            'limit': limit,
            **param_acc
        }

        results = self.db.execute(query, params).fetchall()

        ads = []
        for row in results:
            ads.append({
                'ad_id': str(row.ad_id),
                'ad_name': str(row.ad_name) if row.ad_name else None,
                'title': str(row.title) if row.title else None,
                'body': str(row.body) if row.body else None,
                'cta': str(row.cta) if row.cta else None,
                'thumbnail_url': str(row.image_url) if row.image_url else None,
                'is_video': bool(row.is_video),
                'spend': float(row.spend or 0),
                'clicks': int(row.clicks or 0),
                'ctr': round(float(row.ctr or 0), 2)
            })

        return ads

    def get_historical_recommendations(
        self,
        account_ids: List[int],
        lookback_days: int = 90
    ) -> Dict[str, Any]:
        """
        Get all historical recommendations in a single call.
        Combines age groups, locations, CTAs, campaigns for clone, and ads for creative clone.
        """
        return {
            'age_groups': self.get_top_age_groups(account_ids, lookback_days),
            'locations': self.get_top_locations(account_ids, lookback_days),
            'ctas': self.get_cta_performance(account_ids, lookback_days),
            'campaigns_for_clone': self.get_campaigns_for_clone(account_ids, lookback_days),
            'ads_for_creative_clone': self.get_ads_for_creative_clone(account_ids, lookback_days)
        }
