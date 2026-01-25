from sqlalchemy.orm import Session
from typing import List, Tuple, Dict, Any

# Shared SQL fragment for conversion metrics subquery
# Used by multiple repositories to aggregate conversion data from fact_action_metrics
CONVERSION_SUBQUERY = """
    SELECT date_id, account_id, campaign_id, adset_id, ad_id, creative_id,
           SUM(action_count) as action_count,
           SUM(action_value) as action_value
    FROM fact_action_metrics fam
    JOIN dim_action_type dat ON fam.action_type_id = dat.action_type_id
    JOIN dim_date d2 ON fam.date_id = d2.date_id
    WHERE dat.is_conversion = TRUE
        AND d2.date >= :start_date
        AND d2.date <= :end_date
    GROUP BY 1, 2, 3, 4, 5, 6
"""


class BaseRepository:
    """Base repository class for handling database sessions."""

    def __init__(self, db: Session):
        self.db = db

    def build_in_clause(self, values: List[Any], param_prefix: str) -> Tuple[str, Dict[str, Any]]:
        """
        Build SQL IN clause with parameterized placeholders.

        Args:
            values: List of values for the IN clause
            param_prefix: Prefix for parameter names (e.g., 'acc_id')

        Returns:
            Tuple of (placeholder_string, params_dict)
            e.g., (':acc_id_0, :acc_id_1', {'acc_id_0': 123, 'acc_id_1': 456})
        """
        if not values:
            return '', {}
        placeholders = ', '.join([f':{param_prefix}_{i}' for i in range(len(values))])
        params = {f'{param_prefix}_{i}': v for i, v in enumerate(values)}
        return placeholders, params

    def get_conversion_subquery(self) -> str:
        """
        Get the standard conversion metrics subquery.
        Use this in LEFT JOIN to aggregate conversions from fact_action_metrics.

        Requires :start_date and :end_date parameters to be bound.

        Returns:
            SQL subquery string for conversion aggregation
        """
        return CONVERSION_SUBQUERY
