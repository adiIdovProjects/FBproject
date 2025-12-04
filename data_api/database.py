# data_api/database.py

from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

# ודא שטעינת המשתנים מתבצעת
load_dotenv() 

# שליפת משתני DB
DB_USER = os.getenv("POSTGRES_USER")
DB_PASS = os.getenv("DB_PASSWORD") 
DB_HOST = os.getenv("POSTGRES_HOST")
DB_PORT = os.getenv("POSTGRES_PORT")
DB_NAME = os.getenv("POSTGRES_DB")

# בדיקה קריטית
if not all([DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME]):
    raise EnvironmentError("❌ FATAL: One of the DB environment variables is missing or empty. Please check the .env ::file.data_api/database.py")

# מחרוזת החיבור ל-PostgreSQL
DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# יצירת מנוע SQLAlchemy
def get_db_engine():
    """יוצר ומחזיר את מנוע SQLAlchemy לחיבור ל-DB."""
    try:
        engine = create_engine(DATABASE_URL)
        print("✅ SQLAlchemy Engine created and configured for API.")
        return engine
    except Exception as e:
        print(f"❌ Error creating DB engine: {e}")
        return None

ENGINE = get_db_engine()