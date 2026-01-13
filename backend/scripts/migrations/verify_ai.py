"""
Manual verification script for AI Investigator.
"""

import sys
import os
import asyncio
from sqlalchemy.orm import Session
from datetime import date, timedelta

# Add paths for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.api.services.ai_service import AIService
from backend.utils.db_utils import get_db_engine
from sqlalchemy.orm import sessionmaker

async def test_ai_query():
    print("Starting AI Investigator Verification...")
    
    engine = get_db_engine()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        service = AIService(db)
        if not service.client:
            print("GEMINI_API_KEY not found or client failed to initialize.")
            return

        question = "What is the best performing campaign in the last 30 days?"
        print(f"Querying: '{question}'")
        
        response = await service.query_data(question)
        
        print("\nGemini Response:")
        print("-" * 40)
        print(response.answer)
        print("-" * 40)
        
        if response.data:
            print(f"Data Context included: {len(response.data)} campaigns found.")
            print(f"Verification Success!")
        else:
            print("Response returned but no data context was attached.")
            print("Verification Success (Answer received)!")

    except Exception as e:
        print(f"❌ Verification Failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_ai_query())
