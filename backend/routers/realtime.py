from fastapi import APIRouter, Depends
from schemas.realtime import RealTimeReport
from schemas.auth import UserContext
from core.dependencies import require_role
from db.pool import get_db_conn
import asyncpg
from services.realtime import get_real_time_struggling

router = APIRouter(prefix="/api/real-time-struggling", tags=["realtime"])

@router.get("", response_model=RealTimeReport)
async def route_get_real_time_struggling(
    ctx: UserContext = Depends(require_role("professor", "it_academic_integrity")),
    db: asyncpg.Connection = Depends(get_db_conn)
):
    return await get_real_time_struggling(ctx, db)
