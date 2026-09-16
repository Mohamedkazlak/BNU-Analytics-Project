import asyncpg
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
import repositories.integrity as repo

async def get_integrity_report(ctx: UserContext, db: asyncpg.Connection, filters: AnalyticsFilters | None = None):
    return await repo.get_integrity_report(ctx, db, filters)
