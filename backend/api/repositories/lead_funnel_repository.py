from sqlalchemy.orm import Session
from typing import Optional, Dict, List
from backend.models.schema import LeadFunnelStages, LeadStageAssignment
import json


class LeadFunnelRepository:
    def __init__(self, db: Session):
        self.db = db

    # ==================== FUNNEL STAGES ====================

    def get_funnel_stages(self, account_id: int) -> List[str]:
        """Get funnel stage names for account. Creates default if not exists."""
        record = self.db.query(LeadFunnelStages).filter(
            LeadFunnelStages.account_id == account_id
        ).first()

        if not record:
            # Create default stages (6 stages including Unqualified)
            default_stages = ["New Lead", "Contacted", "Meeting Booked", "Proposal Sent", "Closed", "Unqualified"]
            record = LeadFunnelStages(
                account_id=account_id,
                stage_names=json.dumps(default_stages)
            )
            self.db.add(record)
            self.db.commit()
            return default_stages

        return json.loads(record.stage_names)

    def update_funnel_stages(self, account_id: int, stages: List[str]) -> List[str]:
        """Update funnel stage names for account."""
        record = self.db.query(LeadFunnelStages).filter(
            LeadFunnelStages.account_id == account_id
        ).first()

        if not record:
            record = LeadFunnelStages(
                account_id=account_id,
                stage_names=json.dumps(stages)
            )
            self.db.add(record)
        else:
            record.stage_names = json.dumps(stages)

        self.db.commit()
        return stages

    # ==================== LEAD STAGE ASSIGNMENTS ====================

    def get_lead_stages(self, account_id: int, lead_form_id: str) -> Dict[str, int]:
        """Get stage assignments for all leads in a form. Returns {fb_lead_id: stage_index}."""
        records = self.db.query(LeadStageAssignment).filter(
            LeadStageAssignment.account_id == account_id,
            LeadStageAssignment.lead_form_id == lead_form_id
        ).all()

        return {r.fb_lead_id: r.stage_index for r in records}

    def get_all_lead_stages(self, account_id: int) -> Dict[str, int]:
        """Get stage assignments for all leads across all forms. Returns {fb_lead_id: stage_index}."""
        records = self.db.query(LeadStageAssignment).filter(
            LeadStageAssignment.account_id == account_id
        ).all()

        return {r.fb_lead_id: r.stage_index for r in records}

    def update_lead_stage(
        self,
        account_id: int,
        fb_lead_id: str,
        lead_form_id: str,
        stage_index: int
    ) -> int:
        """Update or create lead stage assignment. Returns the stage_index."""
        record = self.db.query(LeadStageAssignment).filter(
            LeadStageAssignment.account_id == account_id,
            LeadStageAssignment.fb_lead_id == fb_lead_id,
            LeadStageAssignment.lead_form_id == lead_form_id
        ).first()

        if not record:
            record = LeadStageAssignment(
                account_id=account_id,
                fb_lead_id=fb_lead_id,
                lead_form_id=lead_form_id,
                stage_index=stage_index
            )
            self.db.add(record)
        else:
            record.stage_index = stage_index

        self.db.commit()
        return stage_index

    def get_stage_counts(self, account_id: int, lead_form_id: str) -> Dict[int, int]:
        """Get count of leads per stage for a form. Returns {stage_index: count}."""
        from sqlalchemy import func

        results = self.db.query(
            LeadStageAssignment.stage_index,
            func.count(LeadStageAssignment.id)
        ).filter(
            LeadStageAssignment.account_id == account_id,
            LeadStageAssignment.lead_form_id == lead_form_id
        ).group_by(LeadStageAssignment.stage_index).all()

        return {stage_idx: count for stage_idx, count in results}
