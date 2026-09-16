import asyncpg
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
import repositories.performance as repo

async def get_student_performance(ctx: UserContext, db: asyncpg.Connection, filters: AnalyticsFilters | None = None):
    return await repo.get_student_performance(ctx, db, filters)
