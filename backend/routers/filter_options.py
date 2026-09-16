from fastapi import APIRouter, Depends
import asyncpg

from schemas.filters import FilterOptionsResponse, AnalyticsFilters
from schemas.auth import UserContext
from core.dependencies import get_live_user, get_partial_filters
from db.pool import get_db_conn
from repositories.filter_options import get_filter_options

router = APIRouter(tags=["filter_options"])


@router.get("/api/filter-options", response_model=FilterOptionsResponse)
async def route_filter_options(
    ctx: UserContext = Depends(get_live_user),
    db: asyncpg.Connection = Depends(get_db_conn),
    filters: AnalyticsFilters = Depends(get_partial_filters),
):
    return await get_filter_options(ctx, db, filters)
