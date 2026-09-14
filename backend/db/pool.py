from fastapi import Request
import asyncpg
from core.config import settings
from urllib.parse import urlparse, urlunparse

def get_app_user_db_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme in ("postgres", "postgresql"):
        original_user = parsed.username
        new_user = "app_user"
        if original_user and "." in original_user:
            # Supabase connection pooler format: user.project_ref
            project_ref = original_user.split(".", 1)[1]
            new_user = f"app_user.{project_ref}"
        
        netloc = f"{new_user}:app_user_password_demo_123@{parsed.hostname}"
        if parsed.port:
            netloc += f":{parsed.port}"
        parsed = parsed._replace(netloc=netloc)
        return urlunparse(parsed)
    return url

async def create_pool():
    # Use app_user for the connection pool
    pool_url = get_app_user_db_url(settings.DATABASE_URL)
    return await asyncpg.create_pool(pool_url)

async def get_db_conn(request: Request):
    """
    Dependency that acquires a connection from the pool, begins a transaction,
    and sets `app.current_user_id` if the user is authenticated.
    """
    async with request.app.state.pool.acquire() as connection:
        async with connection.transaction():
            user_ctx = getattr(request.state, "user", None)
            if user_ctx:
                await connection.execute(
                    "SELECT set_config('app.current_user_id', $1, true)", user_ctx.user_id
                )
            yield connection
