import asyncpg
from schemas.auth import UserContext
import repositories.course_performance as repo

async def get_course_performance(ctx: UserContext, db: asyncpg.Connection):
    return await repo.get_course_performance(ctx, db)
