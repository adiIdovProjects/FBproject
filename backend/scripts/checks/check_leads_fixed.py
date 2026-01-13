import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from api.dependencies import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    res = db.execute(text("SELECT dat.action_type, SUM(fam.action_count) FROM fact_action_metrics fam JOIN dim_action_type dat ON fam.action_type_id = dat.action_type_id GROUP BY 1")).fetchall()
    print("--- Action Metrics ---")
    for row in res:
        print(f"{row[0]}: {row[1]}")

    print("\n--- Core Metrics Leads ---")
    res_core = db.execute(text("SELECT SUM(leads), SUM(lead_website), SUM(lead_form) FROM fact_core_metrics")).fetchone()
    print(f"Total Leads (Column): {res_core[0]}")
    print(f"Website Leads (Column): {res_core[1]}")
    print(f"Form Leads (Column): {res_core[2]}")
finally:
    db.close()
