import asyncio
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from repositories.accounts import _assert_hierarchy
from schemas.filters import AnalyticsFilters
from tests.helpers import make_scope


def test_college_must_belong_to_selected_sector():
    async def run():
        db = AsyncMock()
        db.fetchrow = AsyncMock(
            side_effect=[
                {"id": "sec-a", "level": "sector"},
                {"id": "col-b", "level": "program", "parent_id": "sec-other"},
            ]
        )
        scope = make_scope()
        with pytest.raises(HTTPException) as exc:
            await _assert_hierarchy(
                db, scope, AnalyticsFilters(sector_id="sec-a", college_id="col-b")
            )
        assert exc.value.status_code == 400
        assert "does not belong" in exc.value.detail

    asyncio.run(run())


def test_curriculum_must_belong_to_selected_college():
    async def run():
        db = AsyncMock()
        db.fetchrow = AsyncMock(
            side_effect=[
                {"id": "sec-a", "level": "sector"},
                {"id": "col-a", "level": "program", "parent_id": "sec-a"},
                {"id": "c1", "program_id": "col-other"},
            ]
        )
        scope = make_scope()
        with pytest.raises(HTTPException) as exc:
            await _assert_hierarchy(
                db,
                scope,
                AnalyticsFilters(
                    sector_id="sec-a", college_id="col-a", curriculum_id="c1"
                ),
            )
        assert exc.value.status_code == 400

    asyncio.run(run())


def test_student_must_belong_to_selected_college():
    async def run():
        db = AsyncMock()
        db.fetchrow = AsyncMock(
            side_effect=[
                {"id": "sec-a", "level": "sector"},
                {"id": "col-a", "level": "program", "parent_id": "sec-a"},
                {"id": "s-other", "program_id": "col-other"},
            ]
        )
        scope = make_scope()
        with pytest.raises(HTTPException) as exc:
            await _assert_hierarchy(
                db,
                scope,
                AnalyticsFilters(
                    sector_id="sec-a", college_id="col-a", student_id="s-other"
                ),
            )
        assert exc.value.status_code == 403

    asyncio.run(run())


def test_professor_assigned_and_enrolled_student_is_allowed():
    async def run():
        db = AsyncMock()
        db.fetchrow = AsyncMock(
            side_effect=[
                {"id": "c1", "program_id": "col-a"},
                {"id": "s7", "program_id": "col-a"},
                {"ok": 1},
            ]
        )
        scope = make_scope(
            role="professor",
            scope_id=None,
            scope_level=None,
            person_id="p-prof",
            course_ids=["c1"],
        )
        await _assert_hierarchy(
            db, scope, AnalyticsFilters(curriculum_id="c1", student_id="s7")
        )

    asyncio.run(run())


def test_professor_assigned_course_non_enrolled_student_denied():
    async def run():
        db = AsyncMock()
        db.fetchrow = AsyncMock(
            side_effect=[
                {"id": "c1", "program_id": "col-a"},
                {"id": "s70", "program_id": "col-art"},
                None,
            ]
        )
        scope = make_scope(
            role="professor",
            scope_id=None,
            scope_level=None,
            person_id="p-prof",
            course_ids=["c1"],
        )
        with pytest.raises(HTTPException) as exc:
            await _assert_hierarchy(
                db, scope, AnalyticsFilters(curriculum_id="c1", student_id="s70")
            )
        assert exc.value.status_code == 403

    asyncio.run(run())


def test_professor_outside_selected_college_is_denied():
    async def run():
        db = AsyncMock()
        db.fetchrow = AsyncMock(
            side_effect=[
                {"id": "sec-a", "level": "sector"},
                {"id": "col-a", "level": "program", "parent_id": "sec-a"},
                {"id": "p-foreign"},
                None,
            ]
        )
        scope = make_scope()
        with pytest.raises(HTTPException) as exc:
            await _assert_hierarchy(
                db,
                scope,
                AnalyticsFilters(
                    sector_id="sec-a",
                    college_id="col-a",
                    professor_id="p-foreign",
                ),
            )
        assert exc.value.status_code == 403

    asyncio.run(run())


def test_professor_unassigned_course_enrolled_student_denied():
    async def run():
        db = AsyncMock()
        db.fetchrow = AsyncMock(
            side_effect=[
                {"id": "c10", "program_id": "col-a"},
            ]
        )
        scope = make_scope(
            role="professor",
            scope_id=None,
            scope_level=None,
            person_id="p-prof",
            course_ids=["c1"],
        )
        with pytest.raises(HTTPException) as exc:
            await _assert_hierarchy(
                db, scope, AnalyticsFilters(curriculum_id="c10", student_id="s7")
            )
        assert exc.value.status_code == 403

    asyncio.run(run())
