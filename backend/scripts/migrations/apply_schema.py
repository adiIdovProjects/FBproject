from backend.utils.db_utils import get_db_engine
from models.schema import create_schema
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

def apply_schema():
    print("Applying schema updates...")
    try:
        engine = get_db_engine()
        create_schema(engine)
        print("Schema updates applied successfully.")
    except Exception as e:
        print(f"Error applying schema: {e}")

if __name__ == "__main__":
    apply_schema()
