from typing import Optional, Tuple

from schemas.filters import AnalyticsFilters


def attempt_where(
    filters: AnalyticsFilters,
    start: int = 1,
    alias: str = "a",
) -> Tuple[str, list, int]:
    """SQL AND-clauses for v_exam_attempts (sector_id, program_id, course_id, student_id)."""
    clauses: list[str] = []
    args: list = []
    i = start
    if filters.sector_id:
        clauses.append(f"{alias}.sector_id = ${i}")
        args.append(filters.sector_id)
        i += 1
    if filters.college_id:
        clauses.append(f"{alias}.program_id = ${i}")
        args.append(filters.college_id)
        i += 1
    if filters.curriculum_id:
        clauses.append(f"{alias}.course_id = ${i}")
        args.append(filters.curriculum_id)
        i += 1
    if filters.student_id:
        clauses.append(f"{alias}.student_id = ${i}")
        args.append(filters.student_id)
        i += 1
    sql = " AND ".join(clauses) if clauses else "TRUE"
    return sql, args, i


def student_where(
    filters: AnalyticsFilters,
    start: int = 1,
    alias: str = "s",
) -> Tuple[str, list, int]:
    clauses: list[str] = []
    args: list = []
    i = start
    if filters.sector_id:
        clauses.append(f"{alias}.sector_id = ${i}")
        args.append(filters.sector_id)
        i += 1
    if filters.college_id:
        clauses.append(f"{alias}.program_id = ${i}")
        args.append(filters.college_id)
        i += 1
    if filters.student_id:
        clauses.append(f"{alias}.id = ${i}")
        args.append(filters.student_id)
        i += 1
    if filters.curriculum_id:
        clauses.append(
            f"""EXISTS (
                SELECT 1
                FROM enrollments e
                JOIN course_offerings o ON o.id = e.offering_id
                WHERE e.student_id = {alias}.id AND o.course_id = ${i}
            )"""
        )
        args.append(filters.curriculum_id)
        i += 1
    sql = " AND ".join(clauses) if clauses else "TRUE"
    return sql, args, i


def course_org_where(
    filters: AnalyticsFilters,
    start: int = 1,
    course_alias: str = "c",
    program_alias: str = "p",
) -> Tuple[str, list, int]:
    clauses: list[str] = []
    args: list = []
    i = start
    if filters.sector_id:
        clauses.append(f"{program_alias}.parent_id = ${i}")
        args.append(filters.sector_id)
        i += 1
    if filters.college_id:
        clauses.append(f"{course_alias}.program_id = ${i}")
        args.append(filters.college_id)
        i += 1
    if filters.curriculum_id:
        clauses.append(f"{course_alias}.id = ${i}")
        args.append(filters.curriculum_id)
        i += 1
    sql = " AND ".join(clauses) if clauses else "TRUE"
    return sql, args, i
