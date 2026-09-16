from fastapi import APIRouter, Depends
from schemas.performance import StudentPerformanceReport
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
from core.dependencies import require_role, get_validated_filters
from db.pool import get_db_conn
import asyncpg
from services.performance import get_student_performance

router = APIRouter(prefix="/api/student-performance", tags=["performance"])

@router.get("", response_model=StudentPerformanceReport)
async def route_get_student_performance(
    ctx: UserContext = Depends(require_role("senior_management", "program_director", "academic_affairs", "professor")),
    db: asyncpg.Connection = Depends(get_db_conn),
    filters: AnalyticsFilters = Depends(get_validated_filters),
):
    return await get_student_performance(ctx, db, filters)
