import asyncpg
from schemas.auth import UserContext
import repositories.realtime as repo

async def get_real_time_struggling(ctx: UserContext, db: asyncpg.Connection):
    return await repo.get_real_time_struggling(ctx, db)
