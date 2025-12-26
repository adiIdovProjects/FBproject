
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def check_db():
    DB_USER = os.getenv("POSTGRES_USER", "postgres")
    DB_PASS = os.getenv("DB_PASSWORD", "postgres")
    DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
    DB_PORT = os.getenv("POSTGRES_PORT", "5432")
    DB_NAME = os.getenv("POSTGRES_DB", "postgres")
    
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        result = conn.execute(text('SELECT creative_id, video_avg_time_watched, video_plays FROM fact_core_metrics WHERE video_plays > 0 LIMIT 10'))
        rows = result.fetchall()
        print(f"Sample rows from fact_core_metrics:")
        for row in rows:
            print(f" - Creative {row[0]}: AvgWatch={row[1]}, Plays={row[2]}")

if __name__ == "__main__":
    check_db()
