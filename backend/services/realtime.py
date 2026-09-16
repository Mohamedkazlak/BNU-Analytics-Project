import asyncpg
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
import repositories.realtime as repo

async def get_real_time_struggling(ctx: UserContext, db: asyncpg.Connection, filters: AnalyticsFilters | None = None):
    return await repo.get_real_time_struggling(ctx, db, filters)
