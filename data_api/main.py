# data_api/main.py

from fastapi import FastAPI, HTTPException, Query
from sqlalchemy.sql import text
from sqlalchemy.orm import Session
from database import ENGINE 
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import date
from typing import Optional # ייבוא Optional
import logging 

# הגדרת לוגר פשוט
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Meta Ads Data API",
    description="API for fetching clean data from PostgreSQL for a Dashboard"
)

# הגדרת CORS
origins = ["*"] 
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class DailyKpi(BaseModel):
    date: date
    spend: float
    purchases: int

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "Meta Ads API is running"}


# --- 1. KPI Summary Endpoint ---
@app.get("/api/kpis/summary")
def get_kpis_summary(
    # הגדרה של פרמטרים אופציונליים מסוג date
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)")
):
    """
    שולף מדדים מסכמים (KPIs) מתוך טבלת נתוני הליבה, עם סינון אופציונלי לפי תאריכים.
    """
    if ENGINE is None:
        logger.error("DB Engine is None, cannot connect.")
        raise HTTPException(status_code=500, detail="Database connection failed")

    # בניית תנאי ה-WHERE והפרמטרים
    where_conditions = []
    params = {}
    
    if start_date:
        where_conditions.append('"Date" >= :start_date')
        params["start_date"] = start_date
    if end_date:
        where_conditions.append('"Date" <= :end_date')
        params["end_date"] = end_date

    where_sql = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""

    # שאילתת SQL לסיכום הנתונים
    sql_query_template = """
        SELECT
            CAST(SUM("Spend") AS NUMERIC(10, 2)) AS total_spend,
            SUM("Purchases") AS total_purchases
        FROM core_campaign_daily
        {where_sql};
    """
    sql_query = text(sql_query_template.format(where_sql=where_sql))
    
    try:
        with Session(ENGINE) as session:
            # העברת הפרמטרים לשאילתה בצורה בטוחה
            result = session.execute(sql_query, params).fetchone() 
            
            if result is None:
                raise HTTPException(status_code=404, detail="No data found in the core table")

            summary = dict(result._mapping)
            
            # חישוב CPA ועיצוב נתונים (אותה לוגיקה)
            total_spend = summary['total_spend']
            total_purchases = summary['total_purchases']
            
            summary['total_spend'] = float(total_spend) 
            
            if total_purchases and total_spend:
                summary['cpa'] = round(summary['total_spend'] / total_purchases, 2)
            else:
                summary['cpa'] = 0.0
            
            return summary
            
    except Exception as e:
        logger.error(f"Error fetching KPIs: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


# --- 2. Daily Data Endpoint (for Charts) ---
@app.get("/api/kpis/daily", response_model=list[DailyKpi])
def get_daily_kpis(
    # הגדרה של פרמטרים אופציונליים מסוג date
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)")
):
    """
    Fetch daily spend and purchases data for charting, with optional date filtering.
    """
    if ENGINE is None:
        logger.error("DB Engine is None, cannot connect.")
        raise HTTPException(status_code=500, detail="Database connection error")

    # בניית תנאי ה-WHERE והפרמטרים (משתמשים שוב באותה לוגיקה)
    where_conditions = []
    params = {}
    
    if start_date:
        where_conditions.append('"Date" >= :start_date')
        params["start_date"] = start_date
    if end_date:
        where_conditions.append('"Date" <= :end_date')
        params["end_date"] = end_date

    where_sql = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""

    # שאילתת SQL שמחזירה נתונים יומיים
    sql_query_template = """
        SELECT
            "Date" AS date,
            CAST(SUM("Spend") AS NUMERIC(10, 2)) AS spend,
            CAST(SUM("Purchases") AS INT) AS purchases
        FROM core_campaign_daily
        {where_sql}
        GROUP BY "Date"
        ORDER BY "Date";
    """
    sql_query = text(sql_query_template.format(where_sql=where_sql))
    
    try:
        with Session(ENGINE) as session:
            # העברת הפרמטרים לשאילתה
            result = session.execute(sql_query, params)
            data = [
                {
                    "date": row.date,
                    "spend": float(row.spend),
                    "purchases": row.purchases
                }
                for row in result
            ]
            return data
            
    except Exception as e:
        logger.error(f"Error fetching daily KPIs: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")