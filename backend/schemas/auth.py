from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    id: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class UserContext(BaseModel):
    user_id: str
    role: str
    scope_id: Optional[str]
    person_id: str
    student_id: Optional[str] = None
