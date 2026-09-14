from fastapi import APIRouter, Depends
from schemas.participation import ParticipationReport
from schemas.auth import UserContext
from core.dependencies import require_role
from db.pool import get_db_conn
import asyncpg
from services.participation import get_participation_report

router = APIRouter(prefix="/api/participation-report", tags=["participation"])

@router.get("", response_model=ParticipationReport)
async def route_get_participation_report(
    ctx: UserContext = Depends(require_role("senior_management", "program_director", "academic_affairs", "professor")),
    db: asyncpg.Connection = Depends(get_db_conn)
):
    return await get_participation_report(ctx, db)
