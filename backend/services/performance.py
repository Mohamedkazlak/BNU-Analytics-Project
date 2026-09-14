import asyncpg
from schemas.auth import UserContext
import repositories.performance as repo

async def get_student_performance(ctx: UserContext, db: asyncpg.Connection):
    return await repo.get_student_performance(ctx, db)
