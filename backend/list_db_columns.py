
import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()

def list_columns():
    DB_USER = os.getenv("POSTGRES_USER", "postgres")
    DB_PASS = os.getenv("DB_PASSWORD", "postgres")
    DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
    DB_PORT = os.getenv("POSTGRES_PORT", "5432")
    DB_NAME = os.getenv("POSTGRES_DB", "postgres")
    
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_engine(DATABASE_URL)
    
    inspector = inspect(engine)
    columns = inspector.get_columns('dim_creative')
    
    print("Columns in dim_creative:")
    for column in columns:
        print(f" - {column['name']}")

if __name__ == "__main__":
    list_columns()
