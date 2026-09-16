import asyncpg
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
import repositories.item_analysis as repo

async def get_item_analysis(ctx: UserContext, db: asyncpg.Connection, filters: AnalyticsFilters | None = None):
    return await repo.get_item_analysis(ctx, db, filters)
