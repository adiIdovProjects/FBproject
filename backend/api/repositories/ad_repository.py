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
        campaign_filter: Optional[str] = None,
        adset_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        account_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get ad-level metrics breakdown.
        """
        # Build campaign filter
        campaign_sql = ""
        if campaign_filter:
            campaign_sql = "AND c.campaign_name ILIKE :campaign_filter"

        # Build adset filter
        adset_sql = ""
        if adset_filter:
            adset_sql = "AND a.adset_name ILIKE :adset_filter"

        # Build search filter for ad name
        search_filter = ""
        if search_query:
            search_filter = "AND ad.ad_name ILIKE :search_query"

        # Build account filter
        account_filter = ""
        param_account_ids = {}
        if account_ids:
            placeholders = ', '.join([f":acc_id_{i}" for i in range(len(account_ids))])
            account_filter = f"AND f.account_id IN ({placeholders})"
            for i, acc_id in enumerate(account_ids):
                param_account_ids[f'acc_id_{i}'] = acc_id

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
            LEFT JOIN dim_campaign c ON f.campaign_id = c.campaign_id
            LEFT JOIN dim_adset a ON f.adset_id = a.adset_id
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
                {campaign_sql}
                {adset_sql}
                {search_filter}
                {account_filter}
            GROUP BY ad.ad_id, ad.ad_name, ad.ad_status
            ORDER BY spend DESC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            **param_account_ids
        }

        if campaign_filter:
            params['campaign_filter'] = f"%{campaign_filter}%"

        if adset_filter:
            params['adset_filter'] = f"%{adset_filter}%"

        if search_query:
            params['search_query'] = f"%{search_query}%"

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

    def get_ads_for_adset(
        self,
        adset_id: int,
        start_date: date,
        end_date: date,
        account_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get ads for a specific ad set with metrics.
        Used for hierarchy view in Manage page.
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
            SELECT
                ad.ad_id,
                ad.ad_name,
                ad.ad_status,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                COALESCE(SUM(conv.action_count), 0) as conversions,
                COALESCE(SUM(conv.action_value), 0) as conversion_value
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
                AND f.adset_id = :adset_id
                {account_filter}
            GROUP BY ad.ad_id, ad.ad_name, ad.ad_status
            ORDER BY spend DESC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date,
            'adset_id': adset_id,
            **param_account_ids
        }

        results = self.db.execute(query, params).fetchall()

        ads = []
        for row in results:
            spend = float(row.spend or 0)
            clicks = int(row.clicks or 0)
            impressions = int(row.impressions or 0)
            conversions = int(row.conversions or 0)

            # Calculate derived metrics
            ctr = (clicks / impressions * 100) if impressions > 0 else 0.0
            cpc = (spend / clicks) if clicks > 0 else 0.0
            cpa = (spend / conversions) if conversions > 0 else 0.0
            conv_rate = (conversions / clicks * 100) if clicks > 0 else 0.0

            ads.append({
                'ad_id': int(row.ad_id),
                'ad_name': str(row.ad_name),
                'ad_status': str(row.ad_status or 'UNKNOWN'),
                'spend': spend,
                'impressions': impressions,
                'clicks': clicks,
                'ctr': ctr,
                'cpc': cpc,
                'conversions': conversions,
                'cpa': cpa,
                'conv_rate': conv_rate
            })

        return ads
