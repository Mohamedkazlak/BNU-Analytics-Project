from fastapi import APIRouter, Depends
from schemas.management import ManagementOverview
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
from core.dependencies import require_role, get_validated_filters
from db.pool import get_db_conn
import asyncpg
from services.management import get_management_overview

router = APIRouter(prefix="/api/management-overview", tags=["management"])

@router.get("", response_model=ManagementOverview)
async def get_overview(
    ctx: UserContext = Depends(require_role("senior_management", "program_director")),
    db: asyncpg.Connection = Depends(get_db_conn),
    filters: AnalyticsFilters = Depends(get_validated_filters),
):
    return await get_management_overview(ctx, db, filters)
