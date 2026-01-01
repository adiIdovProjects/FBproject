import sys
import os

# Add backend and api to path
sys.path.insert(0, os.getcwd())
sys.path.insert(0, os.path.join(os.getcwd(), 'api'))

from api.dependencies import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    # 1. DELETE redundant lead types
    old_leads = ['lead_total', 'lead_website', 'lead_form']
    res = db.execute(text("DELETE FROM dim_action_type WHERE action_type IN :old_leads"), {"old_leads": tuple(old_leads)})
    print(f"Deleted {res.rowcount} redundant lead types.")
    
    # 2. Check for Purchase
    p_check = db.execute(text("SELECT action_type FROM dim_action_type WHERE action_type = 'purchase'")).fetchone()
    if not p_check:
        print("Warning: 'purchase' not found in dim_action_type. Adding it...")
        db.execute(text("INSERT INTO dim_action_type (action_type, is_conversion) VALUES ('purchase', TRUE)"))
    else:
        print("'purchase' exists in dim_action_type.")
        
    db.commit()
    
    # 3. List final types
    print("\nFinal Action Types in Settings:")
    final = db.execute(text("SELECT action_type, is_conversion FROM dim_action_type ORDER BY action_type")).fetchall()
    for row in final:
        print(f"- {row[0]} (is_conversion: {row[1]})")

except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
