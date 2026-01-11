import sys
import os
import traceback
from datetime import date

# Add the project root to the python path
sys.path.append(os.getcwd())

from backend.api.dependencies import get_db
from backend.models.user_schema import User
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config.base_config import settings
from backend.api.services.export_service import ExportService

def reproduce_error():
    # Setup DB connection
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        user = db.query(User).filter(User.google_id.isnot(None), User.email == "adoyidov@gmail.com").first()
        if not user:
            print("User adoyidov@gmail.com not found")
            return

        print(f"Testing export for user: {user.email}")
        
        # specific dummy data
        data = [{"campaign": "Test Campaign", "spend": 100}]

        export_service = ExportService()
        
        try:
            print("Attempting to export to Google Sheets...")
            url = export_service.export_to_google_sheets(
                data=data,
                title="Debug Export Test",
                sheet_name="Facebook Ads Data",
                access_token=user.google_access_token,
                refresh_token=user.google_refresh_token,
                client_id=os.getenv("GOOGLE_CLIENT_ID"),
                client_secret=os.getenv("GOOGLE_CLIENT_SECRET")
            )
            print(f"Success! URL: {url}")
            
            # Debug: check sheet names
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build
            creds = Credentials(token=user.google_access_token)
            service = build('sheets', 'v4', credentials=creds)
            ss_id = url.split('/')[-1]
            meta = service.spreadsheets().get(spreadsheetId=ss_id).execute()
            print("Sheet Names:", [s['properties']['title'] for s in meta.get('sheets', [])])
        except Exception:
            print("\n!!! EXCEPTION CAUGHT !!!")
            traceback.print_exc()

    finally:
        db.close()

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv("backend/.env")
    reproduce_error()
