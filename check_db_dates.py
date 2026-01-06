from backend.api.dependencies import SessionLocal
from sqlalchemy import text

def check_dates():
    db = SessionLocal()
    try:
        query = text("SELECT MIN(d.date), MAX(d.date) FROM fact_core_metrics f JOIN dim_date d ON f.date_id = d.date_id;")
        result = db.execute(query).fetchone()
        print(f"Min date: {result[0]}, Max date: {result[1]}")
        
        query_preview = text("SELECT d.date, SUM(f.spend) FROM fact_core_metrics f JOIN dim_date d ON f.date_id = d.date_id GROUP BY d.date ORDER BY d.date DESC LIMIT 5;")
        results = db.execute(query_preview).fetchall()
        print("Latest dates with spend:")
        for r in results:
            print(f"Date: {r[0]}, Spend: {r[1]}")
    finally:
        db.close()

if __name__ == "__main__":
    check_dates()
