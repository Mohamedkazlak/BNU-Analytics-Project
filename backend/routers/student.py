from fastapi import APIRouter, Depends, HTTPException
from schemas.student import StudentDashboardReport, StudentProfileReport
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
from core.dependencies import require_role, get_partial_filters
from db.pool import get_db_conn
from repositories.accounts import validate_analytics_filters
import asyncpg
from services.student import get_student_dashboard, get_student_profile

router = APIRouter(prefix="/api", tags=["student"])

@router.get("/student-dashboard", response_model=StudentDashboardReport)
async def route_get_student_dashboard(
    ctx: UserContext = Depends(require_role("student")),
    db: asyncpg.Connection = Depends(get_db_conn),
):
    if not ctx.student_id and ctx.role == "student":
        row = await db.fetchrow("SELECT student_id FROM user_accounts WHERE id = $1", ctx.user_id)
        if row:
            ctx.student_id = row["student_id"]
    return await get_student_dashboard(ctx, db)

@router.get("/students/{student_id}", response_model=StudentProfileReport)
async def route_get_student_profile(
    student_id: str,
    ctx: UserContext = Depends(require_role("senior_management", "program_director", "academic_affairs", "professor")),
    db: asyncpg.Connection = Depends(get_db_conn),
    filters: AnalyticsFilters = Depends(get_partial_filters),
):
    scoped = AnalyticsFilters(
        sector_id=filters.sector_id,
        college_id=filters.college_id,
        curriculum_id=filters.curriculum_id,
        student_id=student_id,
    )
    await validate_analytics_filters(ctx, db, scoped, require_complete=False)
    try:
        return await get_student_profile(student_id, ctx, db, scoped)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
