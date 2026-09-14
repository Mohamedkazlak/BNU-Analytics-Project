from fastapi import APIRouter, Depends
from schemas.directory import StudentDirectoryRow
from typing import List
from schemas.auth import UserContext
from core.dependencies import require_role
from db.pool import get_db_conn
import asyncpg
from services.directory import get_student_directory

router = APIRouter(prefix="/api/student-directory", tags=["directory"])

@router.get("", response_model=List[StudentDirectoryRow])
async def route_get_student_directory(
    ctx: UserContext = Depends(require_role("senior_management", "program_director", "academic_affairs", "professor")),
    db: asyncpg.Connection = Depends(get_db_conn)
):
    return await get_student_directory(ctx, db)
