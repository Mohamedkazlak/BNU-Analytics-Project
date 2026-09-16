import asyncio
from unittest.mock import AsyncMock

from schemas.filters import AnalyticsFilters
from tests.helpers import make_scope, make_user


def test_management_repository_applies_sql_filters():
    async def run():
        filters = AnalyticsFilters(sector_id="sec-a", college_id="col-a")
        db = AsyncMock()
        db.fetchrow = AsyncMock(
            return_value={
                "total_attempts": 0,
                "taken_attempts": 0,
                "passed_attempts": 0,
                "total_exams": 0,
            }
        )
        db.fetch = AsyncMock(return_value=[])

        from repositories.management import get_management_overview

        ctx = make_user(make_scope())
        result = await get_management_overview(ctx, db, filters)
        assert result["kpis"]
        sql = db.fetchrow.await_args.args[0]
        assert "sector_id" in sql
        assert "program_id" in sql
        assert db.fetchrow.await_args.args[1:] == ("sec-a", "col-a")

    asyncio.run(run())
