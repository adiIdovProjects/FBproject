from backend.api.dependencies import SessionLocal
from backend.models.schema import AuditLog
import json
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

def check_audit():
    db = SessionLocal()
    try:
        logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()
        
        if not logs:
            print("No audit logs found yet. Try logging in or toggling a conversion setting in the dashboard.")
            return

        print(f"{'TIMESTAMP':<25} | {'EVENT':<20} | {'USER':<10} | {'DESCRIPTION'}")
        print("-" * 100)
        for log in logs:
            # Format timestamp nicely
            ts = log.created_at.strftime("%Y-%m-%d %H:%M:%S")
            print(f"{ts:<25} | {log.event_type:<20} | {log.user_id:<10} | {log.description}")
    except Exception as e:
        print(f"Error checking audit logs: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_audit()
