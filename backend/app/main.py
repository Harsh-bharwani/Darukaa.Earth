import json
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
        cursor.execute(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id, email;",
            (user_in.email, hashed_pw)
        )
        new_user = cursor.fetchone()
        db.commit()
        return new_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()

@app.post("/login", response_model=schemas.Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
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
            
        token_data = {"sub": user["email"], "id": user["id"]}
        access_token = auth.create_access_token(data=token_data)
        return {"access_token": access_token, "token_type": "bearer"}
    finally:
        cursor.close()

# GEOSPATIAL PROJECT & SITE ROUTERS

@app.post("/projects", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: schemas.ProjectCreate, 
    db=Depends(get_db), 
    current_user: dict = Depends(auth.get_current_user)
):
    """Creates an environmental project along with its accompanying map site polygon layers."""
    cursor = db.cursor()
    try:
        # 1. Persist the main project record container linked to the logged-in administrator
        cursor.execute(
            "INSERT INTO projects (title, description, created_by) VALUES (%s, %s, %s) RETURNING id, title, description, created_by;",
            (project_in.title, project_in.description, current_user["id"])
        )
        project = cursor.fetchone()
        project_id = project["id"]
        
        # 2. Iterate through and parse each physical site polygon payload
        created_sites = []
        if project_in.sites:
            for site in project_in.sites:
                # Convert the incoming boundary dictionary payload into a raw string for PostGIS ingestion
                boundary_json_str = json.dumps(site.boundary)
                
                # Utilize ST_GeomFromGeoJSON to interpret the coordinate array into real PostGIS geometry (SRID 4326)
                cursor.execute(
                    """
                    INSERT INTO sites (project_id, site_name, boundary)
                    VALUES (%s, %s, ST_GeomFromGeoJSON(%s))
                    RETURNING id, project_id, site_name, ST_AsGeoJSON(boundary)::json AS boundary;
                    """,
                    (project_id, site.site_name, boundary_json_str)
                )
                new_site = cursor.fetchone()
                created_sites.append(new_site)
        
        db.commit()
        
        # Bundle the database outputs cleanly to map to our Pydantic response expectations
        project["sites"] = created_sites
        return project
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Failed to create project mapping data: {str(e)}"
        )
    finally:
        cursor.close()

@app.get("/projects", response_model=list[schemas.ProjectResponse])
def list_projects(db=Depends(get_db)):
    """Fetches all active projects along with their geometric site boundary structures parsed into GeoJSON."""
    cursor = db.cursor()
    try:
        # Fetch all primary project entries
        cursor.execute("SELECT id, title, description, created_by FROM projects ORDER BY created_at DESC;")
        projects = cursor.fetchall()
        
        for project in projects:
            # For every individual project, query its child site rows and transform geometry to GeoJSON natively
            cursor.execute(
                """
                SELECT id, project_id, site_name, ST_AsGeoJSON(boundary)::json AS boundary
                FROM sites WHERE project_id = %s;
                """,
                (project["id"],)
            )
            project["sites"] = cursor.fetchall()
            
        return projects
    finally:
        cursor.close()
