import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models.schema import AuditLog
from utils.logging_utils import get_logger

logger = get_logger(__name__)

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        user_id: str,
        event_type: str,
        description: str,
        metadata: dict = None,
        ip_address: str = None
    ):
        """
        Records a critical event in the database audit log.
        """
        try:
            audit_entry = AuditLog(
                user_id=user_id,
                event_type=event_type,
                description=description,
                metadata_json=json.dumps(metadata) if metadata else None,
                ip_address=ip_address,
                created_at=datetime.now(timezone.utc)
            )
            db.add(audit_entry)
            db.commit()
            
            logger.info(
                f"AUDIT EVENT: {event_type} for user {user_id}",
                extra={
                    "event": "audit_log_created",
                    "user_id": user_id,
                    "event_type": event_type,
                    "description": description
                }
            )
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to save audit log: {e}", exc_info=True)
