from sqlalchemy.orm import Session
from sqlalchemy import text
import logging
from backend.models.schema import (
    DimCampaign, DimAdset, DimAd, DimInsightHistory,
    FactCoreMetrics, FactPlacementMetrics, FactAgeGenderMetrics,
    FactCountryMetrics, FactActionMetrics
)

logger = logging.getLogger(__name__)

class CleanupService:
    def __init__(self, db: Session):
        self.db = db

    def delete_account_data(self, account_id: int):
        """
        Permanently delete all imported data for a specific ad account.
        Preserves the account definition (DimAccount) but removes all facts and dimensions
        that are strictly owned by this account.
        """
        try:
            logger.info(f"Starting data cleanup for account {account_id}")

            # 1. Delete Fact Tables (Metrics)
            # These have direct FKs to account_id, so we can delete directly
            fact_tables = [
                FactCoreMetrics,
                FactPlacementMetrics,
                FactAgeGenderMetrics,
                FactCountryMetrics,
                FactActionMetrics
            ]
            
            for table in fact_tables:
                deleted = self.db.query(table).filter(table.account_id == account_id).delete(synchronize_session=False)
                logger.debug(f"Deleted {deleted} rows from {table.__tablename__}")

            # 2. Delete Insights
            deleted_insights = self.db.query(DimInsightHistory).filter(DimInsightHistory.account_id == account_id).delete(synchronize_session=False)
            logger.debug(f"Deleted {deleted_insights} rows from dim_insight_history")

            # 3. Delete Dimensions (Order matters due to FKs)
            # Hierarchy: Campaign -> AdSet -> Ad
            # We must delete Ads first, then AdSets, then Campaigns
            
            # Note: Ideally we filter by account_id via joins, but SQLAlchemy delete with join is tricky.
            # Efficient approach: Subqueries or direct ID lists.
            # Given we likely deleted facts, we can be aggressive.
            
            # Strategy:
            # 1. Get Campaign IDs for this account
            # 2. Delete Ads where adset.campaign.account_id = X
            # 3. Delete AdSets where campaign.account_id = X
            # 4. Delete Campaigns where account_id = X
            
            # Using raw SQL for efficient cascading delete verification or just standard ORM with subqueries
            
            # A. Delete Ads
            # DELETE FROM dim_ad WHERE adset_id IN (SELECT adset_id FROM dim_adset WHERE campaign_id IN (SELECT campaign_id FROM dim_campaign WHERE account_id = :aid))
            self.db.execute(
                text("""
                DELETE FROM dim_ad 
                WHERE adset_id IN (
                    SELECT adset_id FROM dim_adset 
                    WHERE campaign_id IN (
                        SELECT campaign_id FROM dim_campaign 
                        WHERE account_id = :account_id
                    )
                )
                """),
                {"account_id": account_id}
            )
            
            # B. Delete AdSets
            self.db.execute(
                text("""
                DELETE FROM dim_adset 
                WHERE campaign_id IN (
                    SELECT campaign_id FROM dim_campaign 
                    WHERE account_id = :account_id
                )
                """),
                {"account_id": account_id}
            )

            # C. Delete Campaigns
            deleted_campaigns = self.db.query(DimCampaign).filter(DimCampaign.account_id == account_id).delete(synchronize_session=False)
            
            self.db.commit()
            logger.info(f"Successfully cleaned up data for account {account_id}. Deleted {deleted_campaigns} campaigns.")
            return True

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to clean up data for account {account_id}: {str(e)}")
            raise e
