import sys
import os

# Add the project root and backend to the Python path
root_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(root_dir)
sys.path.append(os.path.join(root_dir, 'backend'))

import pandas as pd
from sqlalchemy import text
from backend.utils.db_utils import get_db_engine

engine = get_db_engine()

with engine.connect() as conn:
    result = conn.execute(text('SELECT * FROM "dim_adset" LIMIT 1'))
    print(f"Columns in dim_adset: {result.keys()}")
    
    # Check unknown member
    result = conn.execute(text('SELECT * FROM "dim_adset" WHERE "adset_id" = 0'))
    row = result.fetchone()
    if row:
        # result.keys() provides the column names in order
        cols = result.keys()
        data = dict(zip(cols, row))
        print(f"Unknown member: {data}")
    else:
        print("Unknown member (ID=0) not found!")
