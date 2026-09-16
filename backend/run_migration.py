import os
import sys
from pathlib import Path

import asyncio
import asyncpg


async def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required", file=sys.stderr)
        sys.exit(1)

    migrations_dir = Path(__file__).resolve().parent.parent / "db" / "migrations"
    files = sorted(migrations_dir.glob("*.sql"))
    if not files:
        print("No migration files found")
        return

    conn = await asyncpg.connect(database_url)
    try:
        for path in files:
            sql = path.read_text()
            await conn.execute(sql)
            print(f"applied {path.name}")
    finally:
        await conn.close()
    print("Migrations complete")


if __name__ == "__main__":
    asyncio.run(main())
