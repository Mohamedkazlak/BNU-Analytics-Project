import os
import re
import sys
from pathlib import Path

import asyncio
import asyncpg


MIGRATION_NAME = re.compile(r"^(\d{3})_.+\.sql$")
DEFAULT_MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "db" / "migrations"


def collect_migrations(migrations_dir: Path) -> list[tuple[str, Path]]:
    """Return (version, path) in filename order. Duplicate versions are an error."""
    files = sorted(migrations_dir.glob("*.sql"))
    seen: dict[str, Path] = {}
    ordered: list[tuple[str, Path]] = []
    for path in files:
        match = MIGRATION_NAME.match(path.name)
        if not match:
            raise ValueError(
                f"Invalid migration filename {path.name!r}; expected NNN_description.sql"
            )
        version = match.group(1)
        previous = seen.get(version)
        if previous is not None:
            raise ValueError(
                f"Duplicate migration version {version}: {previous.name} and {path.name}"
            )
        seen[version] = path
        ordered.append((version, path))
    return ordered


def _strip_outer_transaction(sql: str) -> str:
    """Remove a file-level BEGIN/COMMIT so the runner can own the transaction.

    Only the first and last non-comment statements are considered. This is not
    a SQL parser and will not touch plpgsql BEGIN/END inside DO blocks.
    """
    lines = sql.splitlines()

    def _is_noise(line: str) -> bool:
        stripped = line.strip()
        return not stripped or stripped.startswith("--")

    start = 0
    while start < len(lines) and _is_noise(lines[start]):
        start += 1
    if start < len(lines) and re.fullmatch(r"begin\s*;", lines[start].strip(), re.I):
        lines.pop(start)

    end = len(lines) - 1
    while end >= 0 and _is_noise(lines[end]):
        end -= 1
    if end >= 0 and re.fullmatch(r"commit\s*;", lines[end].strip(), re.I):
        lines.pop(end)
    return "\n".join(lines).strip()


def _is_nested_transaction_notice(message: object) -> bool:
    text = str(message).lower()
    return "there is already a transaction in progress" in text or (
        "there is no transaction in progress" in text
    )


async def apply_migrations(database_url: str, migrations_dir: Path) -> list[str]:
    files = collect_migrations(migrations_dir)
    if not files:
        print("No migration files found")
        return ["No migration files found"]

    log: list[str] = []
    conn = await asyncpg.connect(database_url)
    notices: list[str] = []

    def _on_log(_connection, message) -> None:
        notices.append(str(message))

    conn.add_log_listener(_on_log)
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
        applied_rows = await conn.fetch(
            "SELECT version, filename FROM public.schema_migrations"
        )
        applied = {row["version"]: row["filename"] for row in applied_rows}
        for version, path in files:
            recorded = applied.get(version)
            if recorded is not None:
                if recorded != path.name:
                    raise RuntimeError(
                        f"Migration version {version} already applied as {recorded}, "
                        f"not {path.name}"
                    )
                msg = f"skip {path.name} (already applied)"
                print(msg)
                log.append(msg)
                continue
            sql = _strip_outer_transaction(path.read_text())
            notice_from = len(notices)
            async with conn.transaction():
                if sql:
                    await conn.execute(sql)
                await conn.execute(
                    """
                    INSERT INTO public.schema_migrations (version, filename)
                    VALUES ($1, $2)
                    """,
                    version,
                    path.name,
                )
            nested = [
                n for n in notices[notice_from:] if _is_nested_transaction_notice(n)
            ]
            if nested:
                raise RuntimeError(
                    f"{path.name} started or committed its own transaction: {nested[0]}"
                )
            msg = f"applied {path.name}"
            print(msg)
            log.append(msg)
    finally:
        await conn.close()
    print("Migrations complete")
    log.append("Migrations complete")
    return log


async def main() -> None:
    database_url = os.getenv("DATABASE_ADMIN_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL or DATABASE_ADMIN_URL is required", file=sys.stderr)
        sys.exit(1)
    migrations_dir = Path(os.getenv("MIGRATIONS_DIR") or DEFAULT_MIGRATIONS_DIR)
    try:
        await apply_migrations(database_url, migrations_dir)
    except (ValueError, RuntimeError, asyncpg.PostgresError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
