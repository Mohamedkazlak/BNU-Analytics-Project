import pytest
from fastapi import HTTPException

from core.authorization import (
    apply_scope_defaults,
    assert_filters_in_scope,
    required_filter_fields,
    visible_filter_fields,
)
from schemas.filters import AnalyticsFilters
from tests.helpers import make_scope


def test_university_sm_does_not_require_sector_and_college():
    scope = make_scope()
    assert required_filter_fields(scope) == []
    assert visible_filter_fields(scope) == ["sector", "college", "professor"]
    assert_filters_in_scope(scope, AnalyticsFilters())


def test_university_sm_accepts_sector_and_college():
    scope = make_scope()
    assert_filters_in_scope(
        scope, AnalyticsFilters(sector_id="sec-a", college_id="col-a")
    )


def test_sector_dean_cannot_query_another_sector():
    scope = make_scope(
        user_id="u-dean",
        scope_id="sec-a",
        scope_level="sector",
        sector_id="sec-a",
        display_role="Sector Dean",
    )
    assert visible_filter_fields(scope) == ["college", "professor"]
    with pytest.raises(HTTPException) as exc:
        assert_filters_in_scope(scope, AnalyticsFilters(sector_id="sec-b", college_id="col-x"))
    assert exc.value.status_code == 403


def test_sector_dean_own_college_is_allowed_after_defaults():
    scope = make_scope(
        user_id="u-dean",
        scope_id="sec-a",
        scope_level="sector",
        sector_id="sec-a",
    )
    narrowed = apply_scope_defaults(scope, AnalyticsFilters(college_id="col-a"))
    assert narrowed.sector_id == "sec-a"
    assert_filters_in_scope(scope, narrowed)


def test_program_director_cannot_query_another_college():
    scope = make_scope(
        role="program_director",
        scope_id="col-a",
        scope_level="program",
        sector_id="sec-a",
        college_id="col-a",
    )
    assert visible_filter_fields(scope) == ["curriculum", "professor", "student"]
    with pytest.raises(HTTPException) as exc:
        assert_filters_in_scope(scope, AnalyticsFilters(college_id="col-other"))
    assert exc.value.status_code == 403


def test_academic_affairs_matches_program_director_filters():
    pd = make_scope(
        role="program_director",
        scope_id="col-a",
        scope_level="program",
        sector_id="sec-a",
        college_id="col-a",
    )
    aa = make_scope(
        role="academic_affairs",
        scope_id="col-a",
        scope_level="program",
        sector_id="sec-a",
        college_id="col-a",
    )
    assert visible_filter_fields(aa) == visible_filter_fields(pd)


def test_program_director_own_curriculum_is_allowed():
    scope = make_scope(
        role="program_director",
        scope_id="col-a",
        scope_level="program",
        sector_id="sec-a",
        college_id="col-a",
    )
    narrowed = apply_scope_defaults(
        scope, AnalyticsFilters(curriculum_id="c1")
    )
    assert narrowed.college_id == "col-a"
    assert_filters_in_scope(scope, narrowed)


def test_professor_cannot_query_unassigned_curriculum():
    scope = make_scope(
        role="professor",
        scope_id=None,
        scope_level=None,
        course_ids=["c1", "c2"],
    )
    with pytest.raises(HTTPException) as exc:
        assert_filters_in_scope(scope, AnalyticsFilters(curriculum_id="c99"))
    assert exc.value.status_code == 403


def test_professor_assigned_curriculum_is_allowed():
    scope = make_scope(
        role="professor",
        scope_id=None,
        scope_level=None,
        course_ids=["c1", "c2"],
    )
    assert visible_filter_fields(scope) == ["curriculum", "student"]
    assert_filters_in_scope(scope, AnalyticsFilters(curriculum_id="c1"))


def test_professor_cannot_spoof_another_professor_filter():
    scope = make_scope(
        role="professor",
        person_id="p-self",
        scope_id=None,
        scope_level=None,
        course_ids=["c1"],
    )
    with pytest.raises(HTTPException) as exc:
        assert_filters_in_scope(scope, AnalyticsFilters(professor_id="p-other"))
    assert exc.value.status_code == 403


def test_student_cannot_query_another_student():
    scope = make_scope(
        role="student",
        student_id="s-self",
        scope_id=None,
        scope_level=None,
    )
    with pytest.raises(HTTPException) as exc:
        assert_filters_in_scope(scope, AnalyticsFilters(student_id="s-other"))
    assert exc.value.status_code == 403


def test_professor_without_assignments_cannot_query_any_curriculum():
    scope = make_scope(
        role="professor",
        scope_id=None,
        scope_level=None,
        course_ids=[],
    )
    with pytest.raises(HTTPException) as exc:
        assert_filters_in_scope(scope, AnalyticsFilters(curriculum_id="c1"))
    assert exc.value.status_code == 403


def test_filters_cannot_expand_program_director_scope():
    scope = make_scope(
        role="program_director",
        scope_id="col-a",
        scope_level="program",
        sector_id="sec-a",
        college_id="col-a",
    )
    narrowed = apply_scope_defaults(scope, AnalyticsFilters())
    assert narrowed.college_id == "col-a"
    assert narrowed.sector_id == "sec-a"


def test_integrity_filters_are_exam_scoped():
    scope = make_scope(
        role="it_academic_integrity",
        scope_id="uni-bnu",
        scope_level="university",
    )
    assert visible_filter_fields(scope) == ["sector", "college", "curriculum"]
    assert required_filter_fields(scope) == []
