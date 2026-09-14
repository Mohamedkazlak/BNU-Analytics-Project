import asyncpg
from schemas.auth import UserContext
import repositories.participation as repo

async def get_participation_report(ctx: UserContext, db: asyncpg.Connection):
    return await repo.get_participation_report(ctx, db)
