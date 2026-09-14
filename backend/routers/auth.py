from fastapi import APIRouter, Depends, HTTPException, Request
from schemas.auth import LoginRequest, TokenResponse, UserContext
from db.pool import get_db_conn
from core.security import verify_password, create_access_token
from core.dependencies import get_current_user
import asyncpg

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: asyncpg.Connection = Depends(get_db_conn)):
    # Use the security definer function to bypass RLS for login
    row = await db.fetchrow("SELECT * FROM get_user_for_login($1)", req.id)
    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not row["password_hash"] or not verify_password(req.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_ctx = {
        "user_id": row["id"],
        "role": row["role"],
        "scope_id": row["scope_id"],
        "person_id": row["person_id"],
        "student_id": row["student_id"],
    }
    access_token = create_access_token(data=user_ctx)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserContext)
async def get_me(current_user: UserContext = Depends(get_current_user)):
    return current_user
