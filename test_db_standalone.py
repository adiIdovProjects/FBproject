
import sys
import os
from sqlalchemy import text

# Add current directory to path
sys.path.append(os.getcwd())

from backend.api.dependencies import SessionLocal

def test_db():
    print("Attempting to create session...")
    db = SessionLocal()
    try:
        print("Session created. Executing query...")
        result = db.execute(text("SELECT 1")).fetchone()
        print(f"Query result: {result}")
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        print("Closing session...")
        db.close()

if __name__ == "__main__":
    test_db()
