"""
Migration script to change video_avg_time_watched column type from BigInteger to Float
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def migrate():
    print("Starting migration: video_avg_time_watched BigInteger -> Float")

    DB_USER = os.getenv("POSTGRES_USER", "postgres")
    DB_PASS = os.getenv("DB_PASSWORD", "postgres")
    DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
    DB_PORT = os.getenv("POSTGRES_PORT", "5432")
    DB_NAME = os.getenv("POSTGRES_DB", "postgres")

    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        # Alter column type
        print("Altering column type to DOUBLE PRECISION (Float)...")
        conn.execute(text("""
            ALTER TABLE fact_core_metrics
            ALTER COLUMN video_avg_time_watched TYPE DOUBLE PRECISION
            USING video_avg_time_watched::DOUBLE PRECISION
        """))
        conn.commit()
        print("[OK] Column type updated successfully")

        # Verify the change
        print("\nVerifying column type...")
        result = conn.execute(text("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = 'fact_core_metrics'
            AND column_name = 'video_avg_time_watched'
        """))
        data_type = result.scalar()
        print(f"[OK] Column type is now: {data_type}")

        # Check sample data
        print("\nChecking sample data...")
        result = conn.execute(text("""
            SELECT COUNT(*) as total,
                   AVG(video_avg_time_watched) as avg_time,
                   MIN(video_avg_time_watched) as min_time,
                   MAX(video_avg_time_watched) as max_time
            FROM fact_core_metrics
            WHERE video_avg_time_watched > 0
        """))
        row = result.fetchone()
        if row and row.total > 0:
            print(f"  Total rows with video time: {row.total}")
            print(f"  Average video time: {row.avg_time:.2f}s")
            print(f"  Min/Max: {row.min_time:.2f}s / {row.max_time:.2f}s")
        else:
            print("  No video time data found in database yet")

    print("\n[SUCCESS] Migration completed successfully!")
    print("[WARNING] Remember to restart the backend server")

if __name__ == "__main__":
    migrate()
