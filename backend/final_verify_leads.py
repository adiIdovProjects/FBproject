import sys
import os

# Add backend and api to path
sys.path.insert(0, os.getcwd())
sys.path.insert(0, os.path.join(os.getcwd(), 'api'))

from api.dependencies import SessionLocal
from sqlalchemy import text

db = SessionLocal()
res = db.execute(text("SELECT dat.action_type, SUM(fam.action_count) FROM fact_action_metrics fam JOIN dim_action_type dat ON fam.action_type_id = dat.action_type_id GROUP BY 1")).fetchall()
print("--- Lead Metrics ---")
for row in res:
    if 'lead' in row[0].lower():
        print(f"{row[0]}: {row[1]}")
