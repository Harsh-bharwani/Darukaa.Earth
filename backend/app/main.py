from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_db

app = FastAPI(title="Darukaa.Earth API Verification")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def check_connection(db=Depends(get_db)):
    try:
        cursor = db.cursor()
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()
        cursor.close()
        
        return {
            "status": "Success",
            "message": "Connected to PostgreSQL database successfully!",
            "postgres_version": db_version["version"]
        }
    except Exception as e:
        return {
            "status": "Failed",
            "message": "Could not connect to the database.",
            "error_details": str(e)
        }
