import asyncpg
from schemas.auth import UserContext
import repositories.integrity as repo

async def get_integrity_report(ctx: UserContext, db: asyncpg.Connection):
    return await repo.get_integrity_report(ctx, db)
