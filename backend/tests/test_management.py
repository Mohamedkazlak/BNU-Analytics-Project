import asyncio
from unittest.mock import AsyncMock

from schemas.filters import AnalyticsFilters
from tests.helpers import make_scope, make_user


def test_management_repository_applies_sql_filters():
    async def run():
        filters = AnalyticsFilters(sector_id="sec-a", college_id="col-a")
        db = AsyncMock()
        db.fetch = AsyncMock(return_value=[])
        db.fetchval = AsyncMock(return_value=False)

        from repositories.management import get_management_overview

        ctx = make_user(make_scope())
        result = await get_management_overview(ctx, db, filters)
        assert result["kpis"]
        sql = db.fetch.await_args_list[0].args[0]
        assert "sector_id" in sql
        assert "program_id" in sql
        assert "GROUPING SETS" in sql
        assert db.fetch.await_args_list[0].args[1:] == ("sec-a", "col-a")

    asyncio.run(run())
