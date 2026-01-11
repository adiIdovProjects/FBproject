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
        search_query: Optional[str] = None,
        account_ids: Optional[List[int]] = None,
        creative_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get age and gender breakdown metrics.
        Aggregates in Python to ensure stability and reusability.
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        creative_filter = ""
        if creative_id is not None:
            creative_filter = "AND f.creative_id = :creative_id"

        # Build status filter
        status_filter = ""
        if campaign_status and campaign_status != ['ALL']:
            placeholders = ', '.join([f":status_{i}" for i in range(len(campaign_status))])
            status_filter = f"AND c.campaign_status IN ({placeholders})"
            
        # Build account filter
        account_filter = ""
        if account_ids is not None:
            if len(account_ids) == 0:
                return []
            placeholders = ', '.join([f":account_id_{i}" for i in range(len(account_ids))])
            account_filter = f"AND f.account_id IN ({placeholders})"

        # Build search filter
        search_filter = ""
        if search_query:
            search_filter = "AND LOWER(c.campaign_name) LIKE :search_query"

        # Always fetch both dimensions from DB
        query = text(f"""
            SELECT
                a.age_group,
                g.gender,
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
                {creative_filter}
                {status_filter}
                {account_filter}
                {search_filter}
            GROUP BY a.age_group, g.gender
            ORDER BY spend DESC
        """)

        params = {
            'start_date': start_date,
            'end_date': end_date
        }

        if campaign_id is not None:
            params['campaign_id'] = campaign_id

        if creative_id is not None:
            params['creative_id'] = creative_id

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

        # Process and Aggregate in Python
        processed_data = {} # Key: (age_group, gender)

        for row in results:
            # Determine key based on group_by
            # If group_by == 'age': key is row.age_group, gender is 'All'
            # If group_by == 'gender': key is row.gender, age_group is 'All'
            # If group_by == 'both': key is (row.age_group, row.gender)
            
            raw_age = str(row.age_group)
            raw_gender = str(row.gender)
            
            if group_by == 'age':
                key = raw_age
                age_val = raw_age
                gender_val = 'All'
            elif group_by == 'gender':
                key = raw_gender
                age_val = 'All'
                gender_val = raw_gender
            else: # both
                key = (raw_age, raw_gender)
                age_val = raw_age
                gender_val = raw_gender

            if key not in processed_data:
                processed_data[key] = {
                    'age_group': age_val,
                    'gender': gender_val,
                    'spend': 0.0,
                    'impressions': 0,
                    'clicks': 0
                }
            
            processed_data[key]['spend'] += float(row.spend or 0)
            processed_data[key]['impressions'] += int(row.impressions or 0)
            processed_data[key]['clicks'] += int(row.clicks or 0)

        # Convert to list
        breakdowns = []
        for metrics in processed_data.values():
            spend = metrics['spend']
            clicks = metrics['clicks']
            impressions = metrics['impressions']
            
            # Derived metrics
            ctr = (clicks / impressions * 100) if impressions > 0 else 0.0
            cpc = (spend / clicks) if clicks > 0 else 0.0

            breakdowns.append({
                'age_group': metrics['age_group'],
                'gender': metrics['gender'],
                'spend': spend,
                'impressions': impressions,
                'clicks': clicks,
                'ctr': ctr,
                'cpc': cpc
            })
        
        # Sort by spend desc (since we re-aggregated, we must re-sort)
        breakdowns.sort(key=lambda x: x['spend'], reverse=True)

        return breakdowns

    def get_placement_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None,
        account_ids: Optional[List[int]] = None,
        creative_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get placement breakdown metrics.
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        creative_filter = ""
        if creative_id is not None:
            creative_filter = "AND f.creative_id = :creative_id"

        # Build status filter
        status_filter = ""
        if campaign_status and campaign_status != ['ALL']:
            placeholders = ', '.join([f":status_{i}" for i in range(len(campaign_status))])
            status_filter = f"AND c.campaign_status IN ({placeholders})"
            
        # Build account filter
        account_filter = ""
        if account_ids is not None:
            if len(account_ids) == 0:
                return []
            placeholders = ', '.join([f":account_id_{i}" for i in range(len(account_ids))])
            account_filter = f"AND f.account_id IN ({placeholders})"
             
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
                {creative_filter}
                {status_filter}
                {account_filter}
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

        if creative_id is not None:
            params['creative_id'] = creative_id

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

        breakdowns = []
        breakdowns = []
        for row in results:
            spend = float(row.spend or 0)
            clicks = int(row.clicks or 0)
            impressions = int(row.impressions or 0)
            
            # Derived metrics
            ctr = (clicks / impressions * 100) if impressions > 0 else 0.0
            cpc = (spend / clicks) if clicks > 0 else 0.0

            breakdowns.append({
                'placement_name': str(row.placement_name),
                'spend': spend,
                'impressions': impressions,
                'clicks': clicks,
                'ctr': ctr,
                'cpc': cpc
            })

        return breakdowns

    def get_platform_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None,
        account_ids: Optional[List[int]] = None
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
            
        # Build account filter
        account_filter = ""
        if account_ids is not None:
            if len(account_ids) == 0:
                return []
            placeholders = ', '.join([f":account_id_{i}" for i in range(len(account_ids))])
            account_filter = f"AND f.account_id IN ({placeholders})"

        # Build search filter
        search_filter = ""
        if search_query:
            search_filter = "AND LOWER(c.campaign_name) LIKE :search_query"

        # Use placement_name and aggregate in Python to avoid DB-specific string functions
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
                {account_filter}
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
                
        # Add account params
        if account_ids:
            for i, aid in enumerate(account_ids):
                params[f'account_id_{i}'] = aid

        results = self.db.execute(query, params).fetchall()

        # Aggregate by platform in Python
        platform_metrics = {}

        for row in results:
            placement_name = str(row.placement_name)
            # Extract platform: "Instagram Stories" -> "Instagram"
            platform = placement_name.split(' ')[0] if ' ' in placement_name else placement_name
            platform = platform.capitalize()

            if platform not in platform_metrics:
                platform_metrics[platform] = {
                    'spend': 0.0,
                    'clicks': 0,
                    'impressions': 0
                }
            
            platform_metrics[platform]['spend'] += float(row.spend or 0)
            platform_metrics[platform]['clicks'] += int(row.clicks or 0)
            platform_metrics[platform]['impressions'] += int(row.impressions or 0)

        breakdowns = []
        for platform, metrics in platform_metrics.items():
            spend = metrics['spend']
            clicks = metrics['clicks']
            impressions = metrics['impressions']
            
            # Derived metrics
            ctr = (clicks / impressions * 100) if impressions > 0 else 0.0
            cpc = (spend / clicks) if clicks > 0 else 0.0

            breakdowns.append({
                'platform': platform, 
                'placement_name': platform, # Required by PlacementBreakdown model
                'spend': spend,
                'impressions': impressions,
                'clicks': clicks,
                'ctr': ctr,
                'cpc': cpc
            })
        
        # Sort by spend desc
        breakdowns.sort(key=lambda x: x['spend'], reverse=True)

        return breakdowns

    def get_country_breakdown(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        top_n: int = 10,
        campaign_status: Optional[List[str]] = None,
        search_query: Optional[str] = None,
        account_ids: Optional[List[int]] = None,
        creative_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get country breakdown metrics.
        """
        campaign_filter = ""
        if campaign_id is not None:
            campaign_filter = "AND f.campaign_id = :campaign_id"

        creative_filter = ""
        if creative_id is not None:
            creative_filter = "AND f.creative_id = :creative_id"

        # Build status filter
        status_filter = ""
        if campaign_status and campaign_status != ['ALL']:
            placeholders = ', '.join([f":status_{i}" for i in range(len(campaign_status))])
            status_filter = f"AND c.campaign_status IN ({placeholders})"
            
        # Build account filter
        account_filter = ""
        if account_ids is not None:
            if len(account_ids) == 0:
                return []
            placeholders = ', '.join([f":account_id_{i}" for i in range(len(account_ids))])
            account_filter = f"AND f.account_id IN ({placeholders})"

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
                {creative_filter}
                {status_filter.replace('c.', 'cmp.')}
                {account_filter}
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

        if creative_id is not None:
            params['creative_id'] = creative_id

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

        breakdowns = []
        breakdowns = []
        for row in results:
            spend = float(row.spend or 0)
            clicks = int(row.clicks or 0)
            impressions = int(row.impressions or 0)
            
            # Derived metrics
            ctr = (clicks / impressions * 100) if impressions > 0 else 0.0
            cpc = (spend / clicks) if clicks > 0 else 0.0

            breakdowns.append({
                'country': str(row.country),
                'spend': spend,
                'impressions': impressions,
                'clicks': clicks,
                'ctr': ctr,
                'cpc': cpc
            })

        return breakdowns
