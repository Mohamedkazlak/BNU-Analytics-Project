import asyncpg
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
import repositories.student as repo

async def get_student_dashboard(ctx: UserContext, db: asyncpg.Connection, filters: AnalyticsFilters | None = None):
    return await repo.get_student_dashboard(ctx, db, filters)

async def get_student_profile(student_id: str, ctx: UserContext, db: asyncpg.Connection, filters: AnalyticsFilters | None = None):
    return await repo.get_student_profile(student_id, ctx, db, filters)
