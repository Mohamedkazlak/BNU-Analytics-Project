from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.security import decode_access_token
from schemas.auth import UserContext
from typing import List

security = HTTPBearer()

async def get_current_user(request: Request, token: HTTPAuthorizationCredentials = Security(security)) -> UserContext:
    payload = decode_access_token(token.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_ctx = UserContext(
        user_id=payload.get("user_id"),
        role=payload.get("role"),
        scope_id=payload.get("scope_id"),
        person_id=payload.get("person_id"),
        student_id=payload.get("student_id"),
    )
    request.state.user = user_ctx
    return user_ctx

def require_role(*allowed_roles: str):
    def role_checker(current_user: UserContext = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return current_user
    return role_checker
