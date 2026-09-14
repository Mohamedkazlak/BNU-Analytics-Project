import asyncpg
from schemas.auth import UserContext
import repositories.student as repo

async def get_student_dashboard(ctx: UserContext, db: asyncpg.Connection):
    return await repo.get_student_dashboard(ctx, db)

async def get_student_profile(student_id: str, ctx: UserContext, db: asyncpg.Connection):
    return await repo.get_student_profile(student_id, ctx, db)
