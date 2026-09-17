from pydantic import BaseModel, EmailStr, Field
from typing import List, Dict, Any, Optional

# AUTHENTICATION & USER SCHEMAS

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters long")

class UserResponse(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# GEOSPATIAL SITE & PROJECT SCHEMAS

class SiteCreate(BaseModel):
    site_name: str = Field(..., min_length=1)
    # Dict[str, Any] captures the structured JSON coordinate geometry array
    boundary: Dict[str, Any] 

class SiteResponse(BaseModel):
    id: int
    project_id: int
    site_name: str
    boundary: Dict[str, Any]

class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    sites: Optional[List[SiteCreate]] = []

class ProjectResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    created_by: Optional[int] = None
    sites: List[SiteResponse] = []
