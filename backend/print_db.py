import pandas as pd
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

from utils.db_utils import get_db_engine
engine = get_db_engine()

print("--- dim_country ---")
df_dim = pd.read_sql('SELECT * FROM "dim_country"', engine)
for _, row in df_dim.iterrows():
    print(f"ID: {row['country_id']} | Name: {row['country']} | Code: {row['country_code']}")

print("\n--- fact_country_metrics Sample (Joined) ---")
query = """
    SELECT f.spend, d.country 
    FROM fact_country_metrics f
    JOIN dim_country d ON f.country_id = d.country_id
    LIMIT 10
"""
df_fact = pd.read_sql(query, engine)
for _, row in df_fact.iterrows():
    print(f"Spend: {row['spend']} | Country: {row['country']}")
