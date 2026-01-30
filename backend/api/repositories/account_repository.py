"""
Account repository for account-level operations.
Handles conversion type queries.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict
from backend.models.schema import FactCoreMetrics


class AccountRepository:
    def __init__(self, db: Session):
        self.db = db

    def has_purchase_value(self, account_id: int) -> bool:
        """
        Check if account has any purchase conversion value > 0.
        Used to determine if ROAS should be displayed for this account.
        """
        query = text("""
            SELECT EXISTS(
                SELECT 1 FROM fact_core_metrics
                WHERE account_id = :account_id AND purchase_value > 0
                LIMIT 1
            )
        """)
        result = self.db.execute(query, {"account_id": account_id}).scalar()
        return bool(result)

    def get_conversion_types(self, account_id: int) -> Dict[str, any]:
        """
        Get list of conversion types that have data for this account.
        Queries fact_core_metrics (fast, denormalized, no joins).
        Returns dict with conversion_types list, is_syncing flag, and has_purchase_value.
        """
        query = text("""
            SELECT
                CASE WHEN SUM(purchases) > 0 THEN 'purchase' ELSE NULL END as purchase,
                CASE WHEN SUM(leads) > 0 THEN 'lead' ELSE NULL END as lead,
                CASE WHEN SUM(add_to_cart) > 0 THEN 'add_to_cart' ELSE NULL END as add_to_cart,
                CASE WHEN SUM(purchase_value) > 0 THEN TRUE ELSE FALSE END as has_purchase_value
            FROM fact_core_metrics
            WHERE account_id = :account_id
        """)

        result = self.db.execute(query, {"account_id": account_id}).fetchone()

        if not result:
            return {"conversion_types": [], "is_syncing": True, "has_purchase_value": False}

        conversion_types = [
            conv for conv in [
                result.purchase,
                result.lead,
                result.add_to_cart
            ] if conv is not None
        ]

        is_syncing = len(conversion_types) == 0

        return {
            "conversion_types": conversion_types,
            "is_syncing": is_syncing,
            "has_purchase_value": bool(result.has_purchase_value)
        }
