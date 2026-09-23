from typing import Tuple

from schemas.filters import AnalyticsFilters


def professor_teaches_course_sql(course_id_sql: str, param_index: int) -> str:
    """True when the professor is assigned to, or instructs an offering of, this course."""
    return (
        f"("
        f"EXISTS ("
        f" SELECT 1 FROM staff_course_assignments sca"
        f" WHERE sca.staff_person_id = ${param_index}"
        f"   AND sca.course_id = {course_id_sql}"
        f") OR EXISTS ("
        f" SELECT 1 FROM course_offerings o"
        f" WHERE o.instructor_id = ${param_index}"
        f"   AND o.course_id = {course_id_sql}"
        f")"
        f")"
    )


def professor_teaches_student_sql(student_id_sql: str, param_index: int) -> str:
    """True when the student is enrolled in a course the professor teaches."""
    return (
        f"EXISTS ("
        f" SELECT 1"
        f" FROM enrollments e"
        f" JOIN course_offerings o ON o.id = e.offering_id"
        f" WHERE e.student_id = {student_id_sql}"
        f"   AND ("
        f"     o.instructor_id = ${param_index}"
        f"     OR EXISTS ("
        f"       SELECT 1 FROM staff_course_assignments sca"
        f"       WHERE sca.course_id = o.course_id"
        f"         AND sca.staff_person_id = ${param_index}"
        f"     )"
        f"   )"
        f")"
    )


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
    if filters.professor_id:
        clauses.append(professor_teaches_course_sql(f"{alias}.course_id", i))
        args.append(filters.professor_id)
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
    if filters.professor_id:
        clauses.append(professor_teaches_student_sql(f"{alias}.id", i))
        args.append(filters.professor_id)
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
    if filters.professor_id:
        clauses.append(professor_teaches_course_sql(f"{course_alias}.id", i))
        args.append(filters.professor_id)
        i += 1
    sql = " AND ".join(clauses) if clauses else "TRUE"
    return sql, args, i
