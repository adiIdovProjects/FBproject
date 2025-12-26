import pandas as pd
try:
    from sqlalchemy import create_engine, text
    import os
    from dotenv import load_dotenv
    # ... rest of imports
except Exception as e:
    print(f"Import error: {e}")
    exit(1)
import os
from dotenv import load_dotenv

# Find .env in the parent directory
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

DB_USER = os.getenv("POSTGRES_USER")
DB_PASS = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("POSTGRES_HOST")
DB_PORT = os.getenv("POSTGRES_PORT")
DB_NAME = os.getenv("POSTGRES_DB")

DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)

def check_table(table_name):
    print(f"\n--- {table_name} ---")
    try:
        df = pd.read_sql(f'SELECT * FROM "{table_name}"', engine)
        if df.empty:
            print("Empty Table")
        else:
            print(df.to_string())
    except Exception as e:
        print(f"Error reading {table_name}: {e}")

check_table("dim_country")
check_table("dim_placement")
check_table("dim_age")
check_table("dim_gender")

print("\n--- fact_country_metrics Sample (Top 5) ---")
try:
    df = pd.read_sql('SELECT * FROM "fact_country_metrics" LIMIT 5', engine)
    print(df)
except Exception as e:
    print(f"Error reading fact_country_metrics: {e}")
