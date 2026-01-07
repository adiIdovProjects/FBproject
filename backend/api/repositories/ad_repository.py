from datetime import date
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from backend.api.repositories.base_repository import BaseRepository

class AdRepository(BaseRepository):
    """Repository for ad metrics."""

    def get_ad_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        adset_id: Optional[int] = None,
        search_query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get ad-level metrics breakdown.
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        adset_filter = ""
        if adset_id is not None:
            adset_filter = "AND f.adset_id = :adset_id"

        # Build search filter for ad name
        search_filter = ""
        if search_query:
            search_filter = "AND LOWER(ad.ad_name) LIKE :search_query"

        query = text(f"""
            SELECT
                ad.ad_id,
                ad.ad_name,
                ad.ad_status,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                COALESCE(SUM(conv.action_count), 0) as conversions,
                COALESCE(SUM(conv.action_value), 0) as conversion_value,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_ad ad ON f.ad_id = ad.ad_id
            LEFT JOIN (
                SELECT fam.date_id, fam.account_id, fam.campaign_id, fam.adset_id, fam.ad_id, fam.creative_id,
                       SUM(fam.action_count) as action_count,
                       SUM(fam.action_value) as action_value
                FROM fact_action_metrics fam
                JOIN dim_action_type dat ON fam.action_type_id = dat.action_type_id
                JOIN dim_date d2 ON fam.date_id = d2.date_id
                WHERE dat.is_conversion = TRUE
                    AND d2.date >= :start_date
                    AND d2.date <= :end_date
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
                {adset_filter}
                {search_filter}
            GROUP BY ad.ad_id, ad.ad_name, ad.ad_status
            ORDER BY spend DESC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date
        }

        if campaign_id is not None:
            params['campaign_id'] = campaign_id

        if adset_id is not None:
            params['adset_id'] = adset_id

        if search_query:
            params['search_query'] = f"%{search_query.lower()}%"

        results = self.db.execute(query, params).fetchall()

        ads = []
        for row in results:
            ads.append({
                'ad_id': int(row.ad_id),
                'ad_name': str(row.ad_name),
                'ad_status': str(row.ad_status or 'UNKNOWN'),
                'spend': float(row.spend or 0),
                'impressions': int(row.impressions or 0),
                'clicks': int(row.clicks or 0),
                'conversions': int(row.conversions or 0),
                'conversion_value': float(row.conversion_value or 0),
                'purchases': int(row.purchases or 0),
                'purchase_value': float(row.purchase_value or 0)
            })

        return ads
