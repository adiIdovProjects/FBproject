from datetime import date
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from backend.api.repositories.base_repository import BaseRepository

class BreakdownRepository(BaseRepository):
    """Repository for breakdown metrics (demographics, placement, platform, country)."""

    def get_age_gender_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        group_by: str = 'both',
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get age and gender breakdown metrics.
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        # Build status filter
        status_filter = ""
        if campaign_status and campaign_status != ['ALL']:
            placeholders = ', '.join([f":status_{i}" for i in range(len(campaign_status))])
            status_filter = f"AND c.campaign_status IN ({placeholders})"
            
        # Build search filter
        search_filter = ""
        if search_query:
            search_filter = "AND LOWER(c.campaign_name) LIKE :search_query"

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
            JOIN dim_campaign c ON f.campaign_id = c.campaign_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {campaign_filter}
                {status_filter}
                {search_filter}
            GROUP BY {group_by_str}
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
        campaign_id: Optional[int] = None,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get placement breakdown metrics.
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        # Build status filter
        status_filter = ""
        if campaign_status and campaign_status != ['ALL']:
            placeholders = ', '.join([f":status_{i}" for i in range(len(campaign_status))])
            status_filter = f"AND c.campaign_status IN ({placeholders})"
            
        # Build search filter
        search_filter = ""
        if search_query:
            search_filter = "AND LOWER(c.campaign_name) LIKE :search_query"

        query = text(f"""
            SELECT
                p.placement_name,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks
            FROM fact_placement_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_placement p ON f.placement_id = p.placement_id
            JOIN dim_campaign c ON f.campaign_id = c.campaign_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {campaign_filter}
                {status_filter}
                {search_filter}
            GROUP BY p.placement_name
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
        campaign_id: Optional[int] = None,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get platform breakdown metrics (derived from placement_name).
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        # Build status filter
        status_filter = ""
        if campaign_status and campaign_status != ['ALL']:
            placeholders = ', '.join([f":status_{i}" for i in range(len(campaign_status))])
            status_filter = f"AND c.campaign_status IN ({placeholders})"
            
        # Build search filter
        search_filter = ""
        if search_query:
            search_filter = "AND LOWER(c.campaign_name) LIKE :search_query"

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
            JOIN dim_campaign c ON f.campaign_id = c.campaign_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {campaign_filter}
                {status_filter}
                {search_filter}
            GROUP BY platform
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

    def get_country_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        top_n: int = 10,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get country breakdown metrics.
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        # Build status filter
        status_filter = ""
        if campaign_status and campaign_status != ['ALL']:
            placeholders = ', '.join([f":status_{i}" for i in range(len(campaign_status))])
            status_filter = f"AND c.campaign_status IN ({placeholders})"
            
        # Build search filter
        search_filter = ""
        if search_query:
            search_filter = "AND LOWER(c.campaign_name) LIKE :search_query"

        query = text(f"""
            SELECT
                c.country,
                SUM(f.spend) as spend,
                SUM(f.impressions) as impressions,
                SUM(f.clicks) as clicks
            FROM fact_country_metrics f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN dim_country c ON f.country_id = c.country_id
            JOIN dim_campaign cmp ON f.campaign_id = cmp.campaign_id
            WHERE d.date >= :start_date
                AND d.date <= :end_date
                {campaign_filter}
                {status_filter.replace('c.', 'cmp.')}
                {search_filter.replace('c.', 'cmp.')}
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

        if search_query:
            params['search_query'] = f"%{search_query.lower()}%"

        # Add status params
        if campaign_status and campaign_status != ['ALL']:
            for i, status in enumerate(campaign_status):
                params[f'status_{i}'] = status

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
