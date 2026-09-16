import asyncpg
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
import repositories.course_performance as repo

async def get_course_performance(ctx: UserContext, db: asyncpg.Connection, filters: AnalyticsFilters | None = None):
    return await repo.get_course_performance(ctx, db, filters)
