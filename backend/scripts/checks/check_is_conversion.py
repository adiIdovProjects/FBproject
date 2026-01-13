import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from api.dependencies import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    res = db.execute(text("SELECT action_type, is_conversion FROM dim_action_type")).fetchall()
    print("--- Action Type Configuration ---")
    for row in res:
        print(f"{row[0]}: {row[1]}")
finally:
    db.close()
