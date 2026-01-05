
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from backend.api.dependencies import get_db

app = FastAPI()

@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1")).fetchone()
    return {"result": result[0]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8003)
