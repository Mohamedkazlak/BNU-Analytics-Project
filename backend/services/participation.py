import asyncpg
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
import repositories.participation as repo

async def get_participation_report(ctx: UserContext, db: asyncpg.Connection, filters: AnalyticsFilters | None = None):
    return await repo.get_participation_report(ctx, db, filters)
