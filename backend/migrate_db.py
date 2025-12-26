
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def add_column():
    DB_USER = os.getenv("POSTGRES_USER", "postgres")
    DB_PASS = os.getenv("DB_PASSWORD", "postgres")
    DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
    DB_PORT = os.getenv("POSTGRES_PORT", "5432")
    DB_NAME = os.getenv("POSTGRES_DB", "postgres")
    
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # Kill conflicting connections if needed (optional, but careful)
            # conn.execute(text("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'postgres' AND pid <> pg_backend_pid();"))
            
            print("Adding column video_avg_time_watched to fact_core_metrics...")
            conn.execute(text('ALTER TABLE fact_core_metrics ADD COLUMN IF NOT EXISTS video_avg_time_watched BIGINT DEFAULT 0'))
            conn.commit()
            print("✅ Column added successfully")
    except Exception as e:
        print(f"❌ Error adding column: {e}")

if __name__ == "__main__":
    add_column()
