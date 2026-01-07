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
