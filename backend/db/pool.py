from urllib.parse import urlparse, urlunparse

import asyncpg
from fastapi import Request

from core.config import settings


def get_app_user_db_url(url: str) -> str:
    """Replace the database username with the configured application user.

    The password is intentionally not embedded in source code. For Supabase
    pooler URLs, the project reference is retained in the username format.
    """
    parsed = urlparse(url)
    if parsed.scheme not in ("postgres", "postgresql"):
        return url

    original_user = parsed.username
    new_user = "app_user"
    if original_user and "." in original_user:
        project_ref = original_user.split(".", 1)[1]
        new_user = f"app_user.{project_ref}"

    # Preserve the configured password from DATABASE_URL.
    password = parsed.password or ""
    host = parsed.hostname or "localhost"
    netloc = f"{new_user}:{password}@{host}"
    if parsed.port:
        netloc += f":{parsed.port}"
    return urlunparse(parsed._replace(netloc=netloc))


async def create_pool():
    return await asyncpg.create_pool(get_app_user_db_url(settings.DATABASE_URL))


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
