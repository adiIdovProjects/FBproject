from datetime import date
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from backend.api.repositories.base_repository import BaseRepository

class AdSetRepository(BaseRepository):
    """Repository for adset metrics."""

    def get_adset_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None,
        account_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get adset-level metrics and targeting info.
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        # Build status filter
        status_filter = ""
        if campaign_status and campaign_status != ['ALL']:
            placeholders = ', '.join([f":status_{i}" for i in range(len(campaign_status))])
            status_filter = f"AND c.campaign_status IN ({placeholders})"

        # Build account filter
        account_filter = ""
        if account_ids:
             # Just use the first one if multiple for now to be safe, or expand
             # The pattern used is manual expansion
             placeholders = ', '.join([f":account_id_{i}" for i in range(len(account_ids))])
             account_filter = f"AND f.account_id IN ({placeholders})"
            
        # Build search filter
        search_filter = ""
        if search_query:
            search_filter = "AND LOWER(c.campaign_name) LIKE :search_query"

        query = text(f"""
            SELECT
                a.adset_id,
                a.adset_name,
                a.targeting_type,
                a.targeting_summary,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks,
                COALESCE(SUM(conv.action_count), 0) as conversions,
                COALESCE(SUM(conv.action_value), 0) as conversion_value,
                SUM(f.purchases) as purchases,
                SUM(f.purchase_value) as purchase_value,
                SUM(f.lead_website) as lead_website,
                SUM(f.lead_form) as lead_form
            FROM fact_core_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_adset a ON f.adset_id = a.adset_id
            JOIN dim_campaign c ON f.campaign_id = c.campaign_id
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
                {status_filter}
                {account_filter}
                {search_filter}
            GROUP BY a.adset_id, a.adset_name, a.targeting_type, a.targeting_summary
            ORDER BY spend DESC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date
        }

        if campaign_id is not None:
            params['campaign_id'] = campaign_id

        if search_query:
            params['search_query'] = f"%{search_query.lower()}%"

        # Add status params
        if campaign_status and campaign_status != ['ALL']:
            for i, status in enumerate(campaign_status):
                params[f'status_{i}'] = status

        # Add account params
        if account_ids:
            for i, aid in enumerate(account_ids):
                params[f'account_id_{i}'] = aid

        results = self.db.execute(query, params).fetchall()

        adsets = []
        for row in results:
            spend = float(row.spend or 0)
            clicks = int(row.clicks or 0)
            impressions = int(row.impressions or 0)
            conversions = int(row.conversions or 0)
            purchase_value = float(row.purchase_value or 0)
            purchases = int(row.purchases or 0)
            
            # Calculate derived metrics
            ctr = (clicks / impressions * 100) if impressions > 0 else 0.0
            cpc = (spend / clicks) if clicks > 0 else 0.0
            roas = (purchase_value / spend) if spend > 0 else 0.0
            cpa = (spend / conversions) if conversions > 0 else 0.0

            adsets.append({
                'adset_id': int(row.adset_id),
                'adset_name': str(row.adset_name),
                'targeting_type': str(row.targeting_type or 'Broad'),
                'targeting_summary': str(row.targeting_summary or 'N/A'),
                'spend': spend,
                'impressions': impressions,
                'clicks': clicks,
                'ctr': ctr,
                'cpc': cpc,
                'conversions': conversions,
                'conversion_value': float(row.conversion_value or 0),
                'lead_website': int(row.lead_website or 0),
                'lead_form': int(row.lead_form or 0),
                'purchases': purchases,
                'purchase_value': purchase_value,
                'roas': roas,
                'cpa': cpa
            })

        return adsets
