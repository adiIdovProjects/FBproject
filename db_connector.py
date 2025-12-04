# db_connector.py

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
import pandas as pd
from datetime import date, datetime # <--- חשוב: הוספת datetime

# טעינת משתני סביבה מקובץ .env
load_dotenv()

# --- הגדרות חיבור ל-DB ---
DB_USER = os.getenv("POSTGRES_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD") 
DB_NAME = os.getenv("POSTGRES_DB")
DB_HOST = os.getenv("POSTGRES_HOST")
DB_PORT = os.getenv("POSTGRES_PORT")

DB_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

try:
    engine = create_engine(DB_URL)
    print("✅ SQLAlchemy Engine created and configured.")
except Exception as e:
    print(f"❌ Error creating SQLAlchemy engine: {e}")
    engine = None

def is_first_pull(table_name: str = 'core_campaign_daily') -> bool:
    """
    בודק האם הטבלה קיימת ומכילה שורות כלשהן.
    """
    if engine is None:
        return True
    
    try:
        with engine.connect() as connection:
            # בדיקה אם הטבלה מכילה שורה אחת לפחות
            result = connection.execute(
                text(f"SELECT 1 FROM \"{table_name}\" LIMIT 1")
            ).fetchone()
            
            return result is None 
            
    except OperationalError as e:
        # טיפול בשגיאה כאשר הטבלה אינה קיימת
        if "does not exist" in str(e):
             print(f"✅ Table {table_name} does not exist. Assuming first pull.")
             return True
        print(f"❌ Operational Error checking DB status: {e}. Assuming first pull.")
        return True
    except Exception as e:
        print(f"❌ General Error checking DB status: {e}. Assuming first pull.")
        return True

def get_latest_date_in_db(table_name: str) -> str | None:
    """
    שולף את תאריך ה'Date' המאוחר ביותר (MAX) הקיים בטבלה הנתונה.
    
    :param table_name: שם הטבלה לבדיקה.
    :return: תאריך בפורמט YYYY-MM-DD או None אם הטבלה ריקה/לא קיימת.
    """
    if engine is None or is_first_pull(table_name):
        return None
        
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text(f"SELECT MAX(\"Date\") FROM \"{table_name}\"")
            ).fetchone()
            
            if result and result[0]:
                date_val = result[0]
                
                # טיפול באובייקטים שונים (date או datetime)
                if isinstance(date_val, datetime) or isinstance(date_val, date):
                    return date_val.strftime('%Y-%m-%d')
            return None
            
    except Exception as e:
        print(f"❌ Error fetching latest date from {table_name}: {e}")
        return None


def save_dataframe_to_db(df: pd.DataFrame, table_name: str, primary_keys: list):
    """
    שומר DataFrame לטבלת PostgreSQL באמצעות UPSERT (Insert/Update) או יצירה ראשונית.
    """
    if engine is None:
        print("🛑 Cannot save data: DB Engine is not initialized.")
        return False
    if df.empty:
        print(f"⚠️ Skipping save for {table_name}: DataFrame is empty.")
        return False

    print(f"⏳ Attempting to save {len(df)} rows to table: **{table_name}**...")

    # --- טיפול במשיכה ראשונה (יצירת הטבלה) ---
    if is_first_pull(table_name):
        print(f"🔄 **FIRST PULL:** Creating table {table_name} and inserting {len(df)} rows...")
        
        # שלב 1: יצירת הטבלה ללא מפתח ראשי
        try:
            df.to_sql(table_name, engine, if_exists='append', index=False, method="multi")
        except Exception as e:
            print(f"❌ **DB Error on initial table creation:** {e}")
            return False

        # שלב 2: הוספת מפתח ראשי לטבלה שנוצרה (כדי לאפשר UPSERT בריצות הבאות)
        try:
            pk_str = ', '.join([f'"{col}"' for col in primary_keys])
            sql_add_pk = f'ALTER TABLE "{table_name}" ADD PRIMARY KEY ({pk_str});'
            
            with engine.begin() as connection:
                connection.execute(text(sql_add_pk))

            print(f"💾 **SUCCESS:** Table {table_name} created and populated with Primary Key.")
            return True
        except Exception as e:
            print(f"❌ **DB Error adding Primary Key to {table_name}:** {e}")
            return False

    # --- לוגיקת UPSERT (אם הטבלה כבר קיימת) ---

    temp_table_name = table_name + '_temp'
    try:
        # יצירת טבלת זמנית להעברת הנתונים
        df.to_sql(temp_table_name, engine, if_exists='replace', index=False, method="multi")
    except Exception as e:
        print(f"❌ Failed to create temporary table {temp_table_name}: {e}")
        return False

    pk_str = ', '.join([f'"{col}"' for col in primary_keys])
    update_cols = [f'"{col}" = EXCLUDED."{col}"' for col in df.columns if col not in primary_keys]
    update_str = ', '.join(update_cols)
    col_names = ', '.join([f'"{col}"' for col in df.columns])

    sql_upsert = f"""
    INSERT INTO "{table_name}" ({col_names})
    SELECT {col_names}
    FROM "{temp_table_name}"
    ON CONFLICT ({pk_str})
    DO UPDATE SET 
        {update_str};
    
    DROP TABLE "{temp_table_name}";
    """
    
    try:
        with engine.begin() as connection:
            connection.execute(text(sql_upsert)) 
        
        print(f"💾 **SUCCESS:** {table_name} updated/inserted {len(df)} rows via UPSERT.")
        return True

    except Exception as e:
        print(f"❌ **DB Error saving {table_name} via UPSERT:** {e}")
        # ניסיון למחוק את הטבלה הזמנית במקרה של כשל
        try:
            with engine.begin() as connection:
                connection.execute(text(f"DROP TABLE IF EXISTS \"{temp_table_name}\";"))
        except Exception as drop_e:
             print(f"⚠️ Failed to drop temporary table {temp_table_name}: {drop_e}")
        return False