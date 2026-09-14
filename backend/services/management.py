import asyncpg
from schemas.auth import UserContext
import repositories.management as repo

async def get_management_overview(ctx: UserContext, db: asyncpg.Connection):
    return await repo.get_management_overview(ctx, db)
