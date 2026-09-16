import asyncpg
from fastapi import Request

from core.config import settings


async def _assert_rls_role(connection: asyncpg.Connection) -> None:
    """Refuse a production connection that would silently bypass RLS."""
    bypass = await connection.fetchval(
        """
        SELECT rolbypassrls OR rolsuper
        FROM pg_roles
        WHERE rolname = current_user
        """
    )
    if not bypass:
        return
    message = (
        "DATABASE_URL is connected as a role that bypasses row-level security "
        f"(current_user={await connection.fetchval('select current_user')}). "
        "Point DATABASE_URL at a non-BYPASSRLS role such as app_user. "
        "Do not store that password in git; set it out of band with ALTER ROLE."
    )
    if settings.APP_ENV == "production":
        raise RuntimeError(message)
    print(f"WARNING: {message}")


async def create_pool():
    pool = await asyncpg.create_pool(
        settings.DATABASE_URL,
        min_size=1,
        max_size=10,
        command_timeout=20,
        server_settings={"statement_timeout": "15000"},
    )
    async with pool.acquire() as connection:
        await _assert_rls_role(connection)
    return pool


async def get_db_conn(request: Request):
    """Acquire a connection and set the transaction-local user context."""
    async with request.app.state.pool.acquire() as connection:
        async with connection.transaction():
            user_ctx = getattr(request.state, "user", None)
            if user_ctx:
                await connection.execute(
                    "SELECT set_config('app.current_user_id', $1, true)",
                    user_ctx.user_id,
                )
            yield connection
