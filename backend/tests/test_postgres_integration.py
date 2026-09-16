"""PostgreSQL integration tests for schema, migrations, and RLS.

Skipped when the admin database is unreachable. CI provides
TEST_DATABASE_URL against a disposable Postgres service.
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse, urlunparse

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = ROOT / "db" / "schema.sql"
SEED = ROOT / "db" / "seed.sql"

ADMIN_URL = os.getenv("TEST_DATABASE_URL") or os.getenv(
    "DATABASE_ADMIN_URL", "postgresql://postgres@localhost:5432/postgres"
)
APP_PASSWORD = "bnu-test-app-pass"
FRESH_DB = "bnu_analytics_ci_fresh"
MIGRATED_DB = "bnu_analytics_ci_migrated"

pytestmark = pytest.mark.integration


def _db_url(dbname: str) -> str:
    parsed = urlparse(ADMIN_URL)
    return urlunparse(parsed._replace(path=f"/{dbname}"))


def _app_url(dbname: str) -> str:
    parsed = urlparse(ADMIN_URL)
    host = parsed.hostname or "localhost"
    port = f":{parsed.port}" if parsed.port else ""
    return f"postgresql://app_user:{APP_PASSWORD}@{host}{port}/{dbname}"


def _psql(url: str, *args: str, sql: str | None = None) -> subprocess.CompletedProcess:
    cmd = ["psql", url, "-v", "ON_ERROR_STOP=1", "-q", *args]
    return subprocess.run(
        cmd,
        input=sql,
        text=True,
        capture_output=True,
        check=False,
    )


def _require_admin() -> None:
    result = _psql(ADMIN_URL, "-c", "SELECT 1")
    if result.returncode != 0:
        pytest.skip(f"PostgreSQL not available: {result.stderr.strip()}")


def _recreate(dbname: str) -> None:
    _psql(
        ADMIN_URL,
        sql=(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            f"WHERE datname = '{dbname}' AND pid <> pg_backend_pid();"
        ),
    )
    drop = _psql(ADMIN_URL, "-c", f"DROP DATABASE IF EXISTS {dbname}")
    if drop.returncode != 0:
        pytest.fail(drop.stderr)
    created = _psql(ADMIN_URL, "-c", f"CREATE DATABASE {dbname}")
    if created.returncode != 0:
        pytest.fail(created.stderr)


def _apply_file(url: str, path: Path) -> None:
    result = _psql(url, "-f", str(path))
    if result.returncode != 0:
        pytest.fail(f"{path.name} failed:\n{result.stderr}\n{result.stdout}")


def _prepare_app_user(url: str) -> None:
    parsed = urlparse(url)
    dbname = parsed.path.lstrip("/")
    alter = _psql(url, sql=f"ALTER ROLE app_user LOGIN PASSWORD '{APP_PASSWORD}';")
    if alter.returncode != 0:
        pytest.fail(alter.stderr)
    grant = _psql(ADMIN_URL, "-c", f'GRANT CONNECT ON DATABASE "{dbname}" TO app_user')
    if grant.returncode != 0:
        pytest.fail(grant.stderr)


async def _fetch(url: str, sql: str, *args):
    import asyncpg

    conn = await asyncpg.connect(url)
    try:
        return await conn.fetch(sql, *args)
    finally:
        await conn.close()


async def _fetch_as_app(dbname: str, user_id: str, sql: str):
    import asyncpg

    conn = await asyncpg.connect(_app_url(dbname))
    try:
        async with conn.transaction():
            await conn.execute(
                "SELECT set_config('app.current_user_id', $1, true)",
                user_id,
            )
            return await conn.fetch(sql)
    finally:
        await conn.close()


def _column_udt(url: str, table: str, column: str) -> str:
    rows = asyncio.run(
        _fetch(
            url,
            """
            SELECT udt_name FROM information_schema.columns
            WHERE table_schema='public' AND table_name=$1 AND column_name=$2
            """,
            table,
            column,
        )
    )
    return rows[0]["udt_name"]


def _policy_qual(url: str, table: str, policy: str) -> str:
    rows = asyncio.run(
        _fetch(
            url,
            """
            SELECT qual FROM pg_policies
            WHERE schemaname='public' AND tablename=$1 AND policyname=$2
            """,
            table,
            policy,
        )
    )
    return rows[0]["qual"] if rows else ""


@pytest.fixture(scope="module")
def fresh_db():
    _require_admin()
    _recreate(FRESH_DB)
    url = _db_url(FRESH_DB)
    _apply_file(url, SCHEMA)
    _apply_file(url, SEED)
    _prepare_app_user(url)
    yield url


@pytest.fixture(scope="module")
def migrated_db(tmp_path_factory):
    _require_admin()
    _recreate(MIGRATED_DB)
    url = _db_url(MIGRATED_DB)
    tmp = tmp_path_factory.mktemp("legacy")
    legacy = tmp / "legacy_schema.sql"
    shown = None
    for ref in ("main:db/schema.sql", "origin/main:db/schema.sql"):
        candidate = subprocess.run(
            ["git", "show", ref],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if candidate.returncode == 0 and candidate.stdout.strip():
            shown = candidate
            break
    if shown is None:
        pytest.skip("main:db/schema.sql is not available for migration comparison")
    legacy.write_text(shown.stdout)
    _apply_file(url, legacy)
    env = os.environ.copy()
    env["DATABASE_ADMIN_URL"] = url
    env["DATABASE_URL"] = url
    runner = subprocess.run(
        [sys.executable, str(ROOT / "backend" / "run_migration.py")],
        cwd=ROOT,
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )
    if runner.returncode != 0:
        pytest.fail(f"migration runner failed:\n{runner.stdout}\n{runner.stderr}")
    if "already a transaction in progress" in (runner.stderr or "").lower():
        pytest.fail(f"nested transaction while migrating:\n{runner.stderr}")
    _prepare_app_user(url)
    yield url


def test_fresh_schema_curriculum_is_text_college(fresh_db):
    assert _column_udt(fresh_db, "courses", "requirement_level_type") == "text"
    assert _column_udt(fresh_db, "courses", "counted_in_cumulative_gpa") == "bool"
    assert _column_udt(fresh_db, "courses", "pass_fail_subject") == "bool"
    rows = asyncio.run(
        _fetch(
            fresh_db,
            "SELECT DISTINCT requirement_level_type AS v FROM courses ORDER BY 1",
        )
    )
    assert [r["v"] for r in rows] == ["college"]
    assert "org_unit_is_visible" in _policy_qual(
        fresh_db, "org_units", "org_units_read"
    )
    tables = asyncio.run(
        _fetch(
            fresh_db,
            """
            SELECT 1 FROM information_schema.tables
            WHERE table_schema='public' AND table_name='schema_migrations'
            """,
        )
    )
    assert tables


def test_migrated_schema_matches_fresh_curriculum_and_org_policy(fresh_db, migrated_db):
    assert _column_udt(migrated_db, "courses", "requirement_level_type") == "text"
    assert _column_udt(migrated_db, "courses", "counted_in_cumulative_gpa") == "bool"
    assert _column_udt(migrated_db, "courses", "pass_fail_subject") == "bool"
    assert "org_unit_is_visible" in _policy_qual(
        migrated_db, "org_units", "org_units_read"
    )
    assert "org_unit_is_visible" in _policy_qual(
        fresh_db, "org_units", "org_units_read"
    )
    versions = asyncio.run(
        _fetch(
            migrated_db,
            "SELECT version FROM public.schema_migrations ORDER BY version",
        )
    )
    assert [r["version"] for r in versions] == [
        "001",
        "002",
        "003",
        "004",
        "005",
        "006",
        "007",
        "008",
        "009",
    ]
    sector_col = asyncio.run(
        _fetch(
            migrated_db,
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_schema='public' AND table_name='v_exam_attempts'
              AND column_name IN ('sector_id', 'program_id')
            ORDER BY 1
            """,
        )
    )
    assert [r["column_name"] for r in sector_col] == ["program_id", "sector_id"]


def test_migration_runner_skips_already_applied(migrated_db):
    env = os.environ.copy()
    env["DATABASE_ADMIN_URL"] = migrated_db
    env["DATABASE_URL"] = migrated_db
    runner = subprocess.run(
        [sys.executable, str(ROOT / "backend" / "run_migration.py")],
        cwd=ROOT,
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )
    assert runner.returncode == 0, runner.stderr
    assert "already a transaction in progress" not in runner.stderr
    assert "skip 001_curriculum_metadata.sql (already applied)" in runner.stdout
    assert "skip 007_org_unit_rls_and_helpers.sql (already applied)" in runner.stdout
    assert (
        "skip 008_revoke_anon_execute_on_helpers.sql (already applied)" in runner.stdout
    )
    assert (
        "skip 009_disable_schema_migrations_rls.sql (already applied)" in runner.stdout
    )
    assert not any(line.startswith("applied ") for line in runner.stdout.splitlines())


def test_failed_migration_rolls_back_and_is_not_recorded(tmp_path):
    _require_admin()
    dbname = "bnu_analytics_ci_migfail"
    _recreate(dbname)
    url = _db_url(dbname)
    migrations = tmp_path / "migrations"
    migrations.mkdir()
    (migrations / "001_ok.sql").write_text("create table mig_ok (id int);")
    (migrations / "002_bad.sql").write_text(
        "create table mig_bad (id int);\nselect 1 / 0;"
    )
    from run_migration import apply_migrations

    with pytest.raises(Exception):
        asyncio.run(apply_migrations(url, migrations))

    recorded = asyncio.run(
        _fetch(url, "SELECT version FROM public.schema_migrations ORDER BY version")
    )
    assert [r["version"] for r in recorded] == ["001"]
    present = asyncio.run(
        _fetch(
            url,
            "SELECT to_regclass('public.mig_ok') AS ok, to_regclass('public.mig_bad') AS bad",
        )
    )
    assert present[0]["ok"] == "mig_ok"
    assert present[0]["bad"] is None


def test_rls_student_cannot_see_other_students(fresh_db):
    rows = asyncio.run(_fetch_as_app(FRESH_DB, "u-student", "SELECT id FROM students"))
    assert [r["id"] for r in rows] == ["s7"]


def test_rls_professor_sees_only_enrolled_assigned_students(fresh_db):
    rows = asyncio.run(_fetch_as_app(FRESH_DB, "u-prof-cs", "SELECT id FROM students"))
    ids = {r["id"] for r in rows}
    assert "s7" in ids
    assert "s70" not in ids


def test_rls_sector_dean_cannot_see_foreign_org_units(fresh_db):
    sectors = asyncio.run(
        _fetch_as_app(
            FRESH_DB,
            "u-dean-eng",
            "SELECT id FROM org_units WHERE level = 'sector'",
        )
    )
    sector_ids = {r["id"] for r in sectors}
    assert "sec-engineering" in sector_ids
    assert "sec-health" not in sector_ids
    colleges = asyncio.run(
        _fetch_as_app(
            FRESH_DB,
            "u-dean-eng",
            "SELECT id FROM org_units WHERE level = 'program'",
        )
    )
    college_ids = {r["id"] for r in colleges}
    assert "prog-computer-science" in college_ids
    assert "prog-medicine" not in college_ids


def test_rls_program_director_cannot_see_other_college(fresh_db):
    rows = asyncio.run(
        _fetch_as_app(
            FRESH_DB,
            "u-pd-cs",
            "SELECT id FROM org_units WHERE level = 'program'",
        )
    )
    assert [r["id"] for r in rows] == ["prog-computer-science"]


def test_rls_university_sm_sees_all_sectors(fresh_db):
    rows = asyncio.run(
        _fetch_as_app(
            FRESH_DB,
            "u-president",
            "SELECT id FROM org_units WHERE level = 'sector'",
        )
    )
    ids = {r["id"] for r in rows}
    assert {"sec-engineering", "sec-health", "sec-humanities"} <= ids


def test_rls_it_does_not_see_transcripts(fresh_db):
    rows = asyncio.run(
        _fetch_as_app(
            FRESH_DB,
            "u-it-integrity",
            "SELECT count(*)::int AS n FROM transcript_entries",
        )
    )
    assert rows[0]["n"] == 0


def test_http_student_and_professor_scope(fresh_db):
    from core.config import settings
    from core.security import get_password_hash
    from fastapi.testclient import TestClient

    hashed = get_password_hash("test-pass")

    async def _set_passwords():
        import asyncpg

        conn = await asyncpg.connect(fresh_db)
        try:
            await conn.execute(
                "UPDATE user_accounts SET password_hash = $1",
                hashed,
            )
        finally:
            await conn.close()

    asyncio.run(_set_passwords())
    settings.DATABASE_URL = _app_url(FRESH_DB)
    settings.APP_ENV = "test"
    from main import app

    with TestClient(app) as client:
        denied = client.post(
            "/auth/login", json={"id": "u-student", "password": "wrong"}
        )
        assert denied.status_code == 401
        login = client.post(
            "/auth/login", json={"id": "u-student", "password": "test-pass"}
        )
        assert login.status_code == 200, login.text
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        assert client.get("/api/student-dashboard", headers=headers).status_code == 200
        assert (
            client.get(
                "/api/student-dashboard?studentId=s70", headers=headers
            ).status_code
            == 403
        )
        assert client.get("/api/students/s70", headers=headers).status_code == 403
        assert (
            client.get(
                "/api/student-performance?studentId=s70", headers=headers
            ).status_code
            == 403
        )
        assert (
            client.get(
                "/api/student-directory?studentId=s70", headers=headers
            ).status_code
            == 403
        )

        prof = client.post(
            "/auth/login", json={"id": "u-prof-cs", "password": "test-pass"}
        )
        assert prof.status_code == 200
        pheaders = {"Authorization": f"Bearer {prof.json()['access_token']}"}
        allowed = client.get("/api/students/s7", headers=pheaders)
        assert allowed.status_code == 200
        assert client.get("/api/students/s70", headers=pheaders).status_code == 403
        assert (
            client.get(
                "/api/filter-options?curriculumId=c10", headers=pheaders
            ).status_code
            == 403
        )
