
import logging
import asyncio
from backend.api.routers.sync import update_sync_status, SYNC_STATUS

# Mocking the sync status update to just print to console for verification
def mock_update_sync_status(user_id, status, progress_percent, error=None):
    print(f"Update: User={user_id}, Status={status}, Progress={progress_percent}%, Error={error}")
    # Call original to keep state if needed
    update_sync_status(user_id, status, progress_percent, error)

# Simple test to verify our logic in main.py works as expected
# We will "mock" the ETL pipeline run method

class MockETLPipeline:
    def run(self, start_date, end_date, user_id=None):
        print(f"Running ETL for {user_id}")
        if user_id: mock_update_sync_status(user_id, "in_progress", 20)
        
        # Extract
        print("Extracting...")
        if user_id: mock_update_sync_status(user_id, "in_progress", 60)
        
        # Transform
        print("Transforming...")
        if user_id: mock_update_sync_status(user_id, "in_progress", 80)
        
        # Load
        print("Loading...")
        if user_id: mock_update_sync_status(user_id, "in_progress", 90)
        
        # Done
        if user_id: mock_update_sync_status(user_id, "completed", 100)

def test_progress_flow():
    pipeline = MockETLPipeline()
    user_id = 999
    
    # Simulate what happens in run_for_user
    print(f"Starting ETL for user {user_id}")
    mock_update_sync_status(user_id, "in_progress", 10)
    
    pipeline.run("2023-01-01", "2023-01-02", user_id=user_id)
    
    print("Final Status:", SYNC_STATUS.get(user_id))

if __name__ == "__main__":
    test_progress_flow()
