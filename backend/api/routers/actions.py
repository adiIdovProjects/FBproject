"""
Actions API router.
Handles listing and toggling conversion action types.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel



from backend.api.dependencies import get_db, get_current_user
from backend.api.services.audit_service import AuditService
from sqlalchemy import text

router = APIRouter(
    prefix="/api/v1/actions", 
    tags=["actions"],
    dependencies=[Depends(get_current_user)]
)

class ActionTypeToggle(BaseModel):
    action_type: str
    is_conversion: bool

@router.get("/types")
def get_action_types(db: Session = Depends(get_db)):
    """Get all action types and their conversion status"""
    query = text("SELECT action_type, is_conversion FROM dim_action_type ORDER BY action_type ASC")
    results = db.execute(query).fetchall()
    
    # Consolidate leads
    final_results = []
    leads = [r for r in results if r.action_type in ['lead_website', 'lead_form']]
    others = [r for r in results if r.action_type not in ['lead_website', 'lead_form']]
    
    for r in others:
        final_results.append({"action_type": r.action_type, "is_conversion": r.is_conversion})
        
    if leads:
        # If any of the lead types are tracked as conversion, show "leads" as tracked
        is_leads_conversion = any(l.is_conversion for l in leads)
        final_results.append({"action_type": "leads", "is_conversion": is_leads_conversion})
    
    # Sort results by action_type for consistent order
    final_results.sort(key=lambda x: x['action_type'])
    
    return final_results

@router.post("/types/toggle")
def toggle_action_type(data: ActionTypeToggle, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Toggle the is_conversion flag for an action type"""
    
    if data.action_type == "leads":
        # Toggle both lead types
        query = text("""
            UPDATE dim_action_type 
            SET is_conversion = :is_conversion 
            WHERE action_type IN ('lead_website', 'lead_form')
        """)
        try:
            result = db.execute(query, {"is_conversion": data.is_conversion})
            db.commit()
            
            # Audit log
            AuditService.log_event(
                db=db,
                user_id=str(getattr(current_user, 'id', 'unknown')),
                event_type="CONVERSION_TOGGLE",
                description=f"Toggled conversion status for leads to {data.is_conversion}",
                metadata={"action_type": "leads", "is_conversion": data.is_conversion}
            )
            
            return {"status": "success", "action_type": "leads", "is_conversion": data.is_conversion}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Standard toggle logic
        query = text("""
            UPDATE dim_action_type 
            SET is_conversion = :is_conversion 
            WHERE action_type = :action_type
        """)
        try:
            result = db.execute(query, {"is_conversion": data.is_conversion, "action_type": data.action_type})
            db.commit()
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Action type not found")
            
            # Audit log
            AuditService.log_event(
                db=db,
                user_id=str(getattr(current_user, 'id', 'unknown')),
                event_type="CONVERSION_TOGGLE",
                description=f"Toggled conversion status for {data.action_type} to {data.is_conversion}",
                metadata={"action_type": data.action_type, "is_conversion": data.is_conversion}
            )
            
            return {"status": "success", "action_type": data.action_type, "is_conversion": data.is_conversion}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

class FunnelStep(BaseModel):
    step_order: int
    action_type: str

class FunnelConfig(BaseModel):
    steps: List[FunnelStep]
    
@router.get("/funnel")
def get_funnel(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the user's defined conversion funnel"""
    # For now, we will store this in a simple way or retrieve from preferences
    # As a simple MVP, we will use a separate table or just a JSON file/User Preference
    # Since we don't have a UserPreference table handy in the imports, let's check if we can add one or use a dummy implementation for the task.
    # Given the constraint, we will store it in a new table 'funnel_steps' if it existed, or simpler: 
    # Create a quick table or use a JSON file in user storage? 
    # Let's create a table on the fly or just return a mock for now and implement storage in next step if table missing.
    # Actually, let's use a simple JSON file for the 'active workspace' since we are in a single-user local app likely.
    
    # Better approach: Check if 'dim_funnel' exists, if not just return empty or default.
    # Let's try to query 'dim_funnel_steps'.
    try:
        query = text("SELECT step_order, action_type FROM funnel_steps ORDER BY step_order ASC")
        results = db.execute(query).fetchall()
        return [{"step_order": r.step_order, "action_type": r.action_type} for r in results]
    except Exception:
        # Table might not exist yet, return defaults
        return []

@router.post("/funnel")
def save_funnel(config: FunnelConfig, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Save the user's conversion funnel"""
    # Create table if not exists (lazy migration for this feature)
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS funnel_steps (
        step_order INTEGER PRIMARY KEY,
        action_type VARCHAR(255) NOT NULL
    );
    """
    try:
        db.execute(text(create_table_sql))
        db.execute(text("DELETE FROM funnel_steps")) # Clear old
        
        for step in config.steps:
            db.execute(text("INSERT INTO funnel_steps (step_order, action_type) VALUES (:order, :type)"), 
                       {"order": step.step_order, "type": step.action_type})
            
        db.commit()
        return {"status": "success", "steps": len(config.steps)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
