from repositories.sql_filters import attempt_where, course_org_where, student_where
from schemas.filters import AnalyticsFilters


def test_attempt_where_is_parameterized():
    filters = AnalyticsFilters(
        sector_id="sec-a",
        college_id="col-a",
        curriculum_id="c1",
        student_id="s7",
    )
    sql, args, next_i = attempt_where(filters, start=1)
    assert "sec-a" not in sql
    assert sql.count("$") == 4
    assert args == ["sec-a", "col-a", "c1", "s7"]
    assert next_i == 5


def test_empty_filters_do_not_widen_with_unbounded_or():
    sql, args, _ = attempt_where(AnalyticsFilters())
    assert sql == "TRUE"
    assert args == []


def test_college_maps_to_program_id():
    sql, args, _ = attempt_where(AnalyticsFilters(college_id="col-a"))
    assert "program_id" in sql
    assert args == ["col-a"]


def test_student_curriculum_filter_uses_exists():
    sql, args, _ = student_where(AnalyticsFilters(curriculum_id="c1"))
    assert "EXISTS" in sql
    assert args == ["c1"]
    assert "c1" not in sql


def test_course_org_where_sector_uses_parent():
    sql, args, _ = course_org_where(AnalyticsFilters(sector_id="sec-a"))
    assert "parent_id" in sql
    assert args == ["sec-a"]
