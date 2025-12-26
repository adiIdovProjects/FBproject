import sys
import os

# Add the project root and backend to the Python path
root_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(root_dir)
sys.path.append(os.path.join(root_dir, 'backend'))

from sqlalchemy import text
from backend.utils.db_utils import get_db_engine

engine = get_db_engine()

migration_queries = [
    'ALTER TABLE "dim_adset" ADD COLUMN IF NOT EXISTS "targeting_type" VARCHAR(50);',
    'ALTER TABLE "dim_adset" ADD COLUMN IF NOT EXISTS "targeting_summary" TEXT;',
]

with engine.connect() as conn:
    print("Running migration...")
    for query in migration_queries:
        try:
            conn.execute(text(query))
            print(f"Executed: {query}")
        except Exception as e:
            print(f"Error executing {query}: {e}")
    
    # Update unknown member
    update_unknown = text("""
        UPDATE "dim_adset" 
        SET "targeting_type" = 'N/A', "targeting_summary" = 'N/A' 
        WHERE "adset_id" = 0;
    """)
    conn.execute(update_unknown)
    print("Updated unknown member.")
    
    conn.commit()

print("Migration completed.")
