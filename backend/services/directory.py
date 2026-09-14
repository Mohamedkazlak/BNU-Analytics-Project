import asyncpg
from schemas.auth import UserContext
import repositories.directory as repo

async def get_student_directory(ctx: UserContext, db: asyncpg.Connection):
    return await repo.get_student_directory(ctx, db)
