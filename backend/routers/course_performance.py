from fastapi import APIRouter, Depends
from schemas.course_performance import CoursePerformanceReport
from schemas.auth import UserContext
from core.dependencies import require_role
from db.pool import get_db_conn
import asyncpg
from services.course_performance import get_course_performance

router = APIRouter(prefix="/api/course-performance", tags=["course_performance"])

@router.get("", response_model=CoursePerformanceReport)
async def route_get_course_performance(
    ctx: UserContext = Depends(require_role("senior_management", "program_director", "academic_affairs", "professor")),
    db: asyncpg.Connection = Depends(get_db_conn)
):
    return await get_course_performance(ctx, db)
