from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
import psycopg2
from app.database import get_db
from app import schemas, auth

app = FastAPI(title="Darukaa.Earth API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "healthy", "message": "Welcome to Darukaa.Earth Geospatial API"}

# AUTHENTICATION ROUTERS

@app.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: schemas.UserCreate, db=Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s;", (user_in.email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )
        
        hashed_pw = auth.hash_password(user_in.password)
        
        # Persist the clean data payload and return the newly generated row ID
        cursor.execute(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id, email;",
            (user_in.email, hashed_pw)
        )
        new_user = cursor.fetchone()
        db.commit()
        return new_user
        
    except psycopg2.Error as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database execution error: {str(e)}"
        )
    finally:
        cursor.close()

@app.post("/login", response_model=schemas.Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    """Verifies user authentication claims against internal records to issue short-lived JWT signatures.""" 
    cursor = db.cursor()
    try:
        cursor.execute("SELECT id, email, password_hash FROM users WHERE email = %s;", (form_data.username,))
        user = cursor.fetchone()
        
        if not user or not auth.verify_password(form_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email credentials or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Generate the cryptographic token payload signed with our server secret
        token_data = {"sub": user["email"], "id": user["id"]}
        access_token = auth.create_access_token(data=token_data)
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    finally:
        cursor.close()
