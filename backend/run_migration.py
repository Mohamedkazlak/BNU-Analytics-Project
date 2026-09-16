import os
import re
import sys
from pathlib import Path

import asyncio
import asyncpg


def _strip_outer_transaction(sql: str) -> str:
    """Remove a file-level BEGIN/COMMIT so the runner can apply atomically."""
    text = sql.strip()
    text = re.sub(r"^begin\s*;\s*", "", text, count=1, flags=re.IGNORECASE)
    text = re.sub(r"\s*commit\s*;\s*$", "", text, count=1, flags=re.IGNORECASE)
    return text.strip()


async def main():
    database_url = os.getenv("DATABASE_ADMIN_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL or DATABASE_ADMIN_URL is required", file=sys.stderr)
        sys.exit(1)

    migrations_dir = Path(__file__).resolve().parent.parent / "db" / "migrations"
    files = sorted(migrations_dir.glob("*.sql"))
    if not files:
        print("No migration files found")
        return

    conn = await asyncpg.connect(database_url)
    try:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS public.schema_migrations (
              version text PRIMARY KEY,
              filename text NOT NULL,
              applied_at timestamptz NOT NULL DEFAULT now()
            )
            """
        )
        applied = {
            row["version"]
            for row in await conn.fetch("SELECT version FROM public.schema_migrations")
        }
        for path in files:
            version = path.stem.split("_", 1)[0]
            if version in applied:
                print(f"skip {path.name} (already applied)")
                continue
            sql = _strip_outer_transaction(path.read_text())
            async with conn.transaction():
                await conn.execute(sql)
                await conn.execute(
                    """
                    INSERT INTO public.schema_migrations (version, filename)
                    VALUES ($1, $2)
                    """,
                    version,
                    path.name,
                )
            print(f"applied {path.name}")
    finally:
        await conn.close()
    print("Migrations complete")


if __name__ == "__main__":
    asyncio.run(main())
