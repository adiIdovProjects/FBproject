"""
Account repository for account-level operations.
Handles account quiz responses and conversion type queries.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Optional, List, Dict
from backend.models.schema import AccountQuizResponses, FactCoreMetrics
import json


class AccountRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_conversion_types(self, account_id: int) -> Dict[str, any]:
        """
        Get list of conversion types that have data for this account.
        Queries fact_core_metrics (fast, denormalized, no joins).
        Returns dict with conversion_types list and is_syncing flag.
        """
        # Query fact_core_metrics for conversions with data > 0
        # This is much faster than querying fact_action_metrics with joins
        query = text("""
            SELECT
                CASE WHEN SUM(purchases) > 0 THEN 'purchase' ELSE NULL END as purchase,
                CASE WHEN SUM(leads) > 0 THEN 'lead' ELSE NULL END as lead,
                CASE WHEN SUM(add_to_cart) > 0 THEN 'add_to_cart' ELSE NULL END as add_to_cart
            FROM fact_core_metrics
            WHERE account_id = :account_id
        """)

        result = self.db.execute(query, {"account_id": account_id}).fetchone()

        if not result:
            # No data yet - account is still syncing
            return {"conversion_types": [], "is_syncing": True}

        # Extract non-null conversion types
        conversion_types = [
            conv for conv in [
                result.purchase,
                result.lead,
                result.add_to_cart
            ] if conv is not None
        ]

        # Check if we have any data at all
        is_syncing = len(conversion_types) == 0

        return {
            "conversion_types": conversion_types,
            "is_syncing": is_syncing
        }

    def save_account_quiz(
        self,
        account_id: int,
        primary_goal: str,
        primary_goal_other: Optional[str],
        primary_conversions: List[str],
        industry: str,
        optimization_priority: str
    ) -> AccountQuizResponses:
        """
        Save or update account quiz responses.
        Uses UPSERT (ON CONFLICT DO UPDATE) logic.
        """
        # Convert list to JSON string
        conversions_json = json.dumps(primary_conversions)

        # Check if quiz response already exists
        existing = self.db.query(AccountQuizResponses).filter(
            AccountQuizResponses.account_id == account_id
        ).first()

        if existing:
            # Update existing
            existing.primary_goal = primary_goal
            existing.primary_goal_other = primary_goal_other
            existing.primary_conversions = conversions_json
            existing.industry = industry
            existing.optimization_priority = optimization_priority
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            # Create new
            quiz_response = AccountQuizResponses(
                account_id=account_id,
                primary_goal=primary_goal,
                primary_goal_other=primary_goal_other,
                primary_conversions=conversions_json,
                industry=industry,
                optimization_priority=optimization_priority
            )
            self.db.add(quiz_response)
            self.db.commit()
            self.db.refresh(quiz_response)
            return quiz_response

    def get_account_quiz(self, account_id: int) -> Optional[Dict]:
        """
        Retrieve account quiz responses.
        Returns None if quiz not completed, otherwise returns dict with responses.
        """
        quiz = self.db.query(AccountQuizResponses).filter(
            AccountQuizResponses.account_id == account_id
        ).first()

        if not quiz:
            return None

        # Parse JSON conversions back to list
        conversions = json.loads(quiz.primary_conversions) if quiz.primary_conversions else []

        return {
            "account_id": quiz.account_id,
            "primary_goal": quiz.primary_goal,
            "primary_goal_other": quiz.primary_goal_other,
            "primary_conversions": conversions,
            "industry": quiz.industry,
            "optimization_priority": quiz.optimization_priority,
            "created_at": quiz.created_at,
            "updated_at": quiz.updated_at
        }
