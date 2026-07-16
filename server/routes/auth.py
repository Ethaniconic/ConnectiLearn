import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Depends, Body
from jose import jwt, JWTError
from bson import ObjectId
from ..config import settings
from ..db import users_collection
from ..models import SignupRequest, LoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = payload.get("id")
        if not user_id or not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_current_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def make_user_response(user: dict) -> dict:
    created_at = user.get("createdAt")
    if isinstance(created_at, datetime):
        created_at_str = created_at.isoformat()
    elif created_at:
        created_at_str = str(created_at)
    else:
        created_at_str = datetime.utcnow().isoformat()

    return {
        "id": str(user["_id"]),
        "_id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "questionnaireCompleted": user.get("questionnaireCompleted", False),
        "learningStyle": user.get("learningStyle"),
        "questionnaire": user.get("questionnaire", []),
        "varkScores": user.get("varkScores", {}),
        "createdAt": created_at_str
    }

@router.post("/signup")
async def signup(req: SignupRequest):
    email_clean = req.email.strip().lower()
    existing = await users_collection.find_one({"email": email_clean})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    hashed_pwd = get_password_hash(req.password)
    now = datetime.utcnow()
    new_user = {
        "name": req.name.strip(),
        "email": email_clean,
        "password": hashed_pwd,
        "role": "user",
        "avatar": "",
        "isActive": True,
        "documentsCount": 0,
        "totalQueries": 0,
        "questionnaireCompleted": False,
        "learningStyle": None,
        "questionnaire": [],
        "createdAt": now,
        "updatedAt": now
    }
    
    res = await users_collection.insert_one(new_user)
    new_user["_id"] = res.inserted_id
    
    token = create_access_token({"id": str(res.inserted_id)})
    return {
        "token": token,
        "user": make_user_response(new_user)
    }

@router.post("/login")
async def login(req: LoginRequest):
    email_clean = req.email.strip().lower()
    user = await users_collection.find_one({"email": email_clean})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    if not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    await users_collection.update_one({"_id": user["_id"]}, {"$set": {"lastLogin": datetime.utcnow()}})
    
    token = create_access_token({"id": str(user["_id"])})
    return {
        "token": token,
        "user": make_user_response(user)
    }

@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return {
        "user": make_user_response(current_user)
    }

@router.post("/setup-admin")
async def setup_admin(email: str = Body(..., embed=True)):
    email_clean = email.strip().lower()
    user = await users_collection.find_one({"email": email_clean})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await users_collection.update_one({"_id": user["_id"]}, {"$set": {"role": "admin", "updatedAt": datetime.utcnow()}})
    user["role"] = "admin"
    return {
        "message": "User promoted to admin successfully",
        "user": make_user_response(user)
    }

