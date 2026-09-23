import asyncpg

from core.authorization import required_filter_fields, visible_filter_fields
from repositories.accounts import load_auth_scope
from repositories.sql_filters import professor_teaches_course_sql
from schemas.auth import UserContext
from schemas.filters import (
    AnalyticsFilters,
    CurriculumOption,
    FilterOption,
    FilterOptionsResponse,
    StudentOption,
)

STUDENT_PAGE_SIZE = 150


def _student_search_clause(alias: str, index: int) -> str:
    return (
        f"AND (${index}::text IS NULL OR {alias}.full_name ILIKE '%' || ${index} || '%' "
        f"OR s.student_number ILIKE '%' || ${index} || '%')"
    )


async def get_filter_options(
    ctx: UserContext,
    db: asyncpg.Connection,
    filters: AnalyticsFilters,
    q: str | None = None,
) -> FilterOptionsResponse:
    scope = await load_auth_scope(db, ctx.user_id)
    visible = visible_filter_fields(scope)
    required = required_filter_fields(scope)
    query = (q or "").strip() or None

    sectors: list[FilterOption] = []
    colleges: list[FilterOption] = []
    curricula: list[CurriculumOption] = []
    professors: list[FilterOption] = []
    students: list[StudentOption] = []
    has_more_students = False

    if "sector" in visible:
        rows = await db.fetch(
            """
            SELECT id, name
            FROM org_units
            WHERE level = 'sector'
            ORDER BY name
            """
        )
        sectors = [FilterOption(id=r["id"], name=r["name"]) for r in rows]

    if "college" in visible:
        sector_id = filters.sector_id or scope.sector_id
        rows = await db.fetch(
            """
            SELECT id, name, parent_id
            FROM org_units
            WHERE level = 'program'
              AND ($1::text IS NULL OR parent_id = $1)
            ORDER BY name
            """,
            sector_id,
        )
        colleges = [
            FilterOption(id=r["id"], name=r["name"], parentId=r["parent_id"])
            for r in rows
        ]

    if "curriculum" in visible:
        college_id = filters.college_id or scope.college_id
        sector_id = filters.sector_id or scope.sector_id
        professor_id = filters.professor_id
        if scope.role == "professor":
            rows = await db.fetch(
                f"""
                SELECT c.id, c.code, c.name, c.program_id
                FROM courses c
                WHERE {professor_teaches_course_sql("c.id", 1)}
                ORDER BY c.code
                """,
                scope.person_id,
            )
        elif college_id:
            rows = await db.fetch(
                f"""
                SELECT c.id, c.code, c.name, c.program_id
                FROM courses c
                WHERE c.program_id = $1
                  AND (
                    $2::text IS NULL
                    OR {professor_teaches_course_sql("c.id", 2)}
                  )
                ORDER BY c.code
                """,
                college_id,
                professor_id,
            )
        elif sector_id and scope.role in ("senior_management", "it_academic_integrity"):
            rows = await db.fetch(
                f"""
                SELECT c.id, c.code, c.name, c.program_id
                FROM courses c
                JOIN org_units p ON p.id = c.program_id
                WHERE p.parent_id = $1
                  AND (
                    $2::text IS NULL
                    OR {professor_teaches_course_sql("c.id", 2)}
                  )
                ORDER BY c.code
                """,
                sector_id,
                professor_id,
            )
        else:
            rows = []
        curricula = [
            CurriculumOption(
                id=r["id"], code=r["code"], name=r["name"], collegeId=r["program_id"]
            )
            for r in rows
        ]

    if "professor" in visible:
        college_id = filters.college_id or scope.college_id
        sector_id = filters.sector_id or scope.sector_id
        rows = await db.fetch(
            """
            SELECT DISTINCT pe.id, pe.full_name AS name
            FROM (
                SELECT sca.staff_person_id AS person_id,
                       c.program_id,
                       p.parent_id AS sector_id,
                       c.id AS course_id
                FROM staff_course_assignments sca
                JOIN courses c ON c.id = sca.course_id
                JOIN org_units p ON p.id = c.program_id
                UNION
                SELECT o.instructor_id,
                       c.program_id,
                       p.parent_id,
                       c.id
                FROM course_offerings o
                JOIN courses c ON c.id = o.course_id
                JOIN org_units p ON p.id = c.program_id
            ) taught
            JOIN people pe ON pe.id = taught.person_id
            WHERE ($1::text IS NULL OR taught.sector_id = $1)
              AND ($2::text IS NULL OR taught.program_id = $2)
              AND ($3::text IS NULL OR taught.course_id = $3)
            ORDER BY pe.full_name
            """,
            sector_id,
            college_id,
            filters.curriculum_id,
        )
        professors = [FilterOption(id=r["id"], name=r["name"]) for r in rows]

    load_students = "student" in visible and (
        scope.role == "professor"
        or filters.curriculum_id
        or filters.college_id
        or scope.college_id
        or filters.professor_id
    )
    if load_students:
        fetch_limit = STUDENT_PAGE_SIZE + 1
        professor_id = (
            scope.person_id if scope.role == "professor" else filters.professor_id
        )
        if scope.role == "professor":
            rows = await db.fetch(
                f"""
                SELECT DISTINCT s.id, pe.full_name AS name, s.program_id
                FROM students s
                JOIN people pe ON pe.id = s.person_id
                JOIN enrollments e ON e.student_id = s.id
                JOIN course_offerings o ON o.id = e.offering_id
                JOIN staff_course_assignments sca
                  ON sca.course_id = o.course_id AND sca.staff_person_id = $1
                WHERE ($2::text IS NULL OR o.course_id = $2)
                  {_student_search_clause("pe", 3)}
                ORDER BY pe.full_name
                LIMIT $4
                """,
                scope.person_id,
                filters.curriculum_id,
                query,
                fetch_limit,
            )
        elif scope.role == "it_academic_integrity":
            college_id = filters.college_id or scope.college_id
            rows = await db.fetch(
                f"""
                SELECT DISTINCT s.id, pe.full_name AS name, s.program_id
                FROM students s
                JOIN people pe ON pe.id = s.person_id
                JOIN exam_attempts a ON a.student_id = s.id
                LEFT JOIN enrollments e ON e.student_id = s.id
                LEFT JOIN course_offerings o ON o.id = e.offering_id
                WHERE ($1::text IS NULL OR s.program_id = $1)
                  AND ($2::text IS NULL OR o.course_id = $2)
                  {_student_search_clause("pe", 3)}
                ORDER BY pe.full_name
                LIMIT $4
                """,
                college_id,
                filters.curriculum_id,
                query,
                fetch_limit,
            )
        else:
            college_id = filters.college_id or scope.college_id
            rows = await db.fetch(
                f"""
                SELECT DISTINCT s.id, pe.full_name AS name, s.program_id
                FROM students s
                JOIN people pe ON pe.id = s.person_id
                LEFT JOIN enrollments e ON e.student_id = s.id
                LEFT JOIN course_offerings o ON o.id = e.offering_id
                WHERE ($1::text IS NULL OR s.program_id = $1)
                  AND ($2::text IS NULL OR o.course_id = $2)
                  AND (
                    $3::text IS NULL
                    OR EXISTS (
                      SELECT 1
                      FROM enrollments e2
                      JOIN course_offerings o2 ON o2.id = e2.offering_id
                      JOIN staff_course_assignments sca
                        ON sca.course_id = o2.course_id
                       AND sca.staff_person_id = $3
                      WHERE e2.student_id = s.id
                    )
                  )
                  {_student_search_clause("pe", 4)}
                ORDER BY pe.full_name
                LIMIT $5
                """,
                college_id,
                filters.curriculum_id,
                professor_id,
                query,
                fetch_limit,
            )
        has_more_students = len(rows) > STUDENT_PAGE_SIZE
        rows = rows[:STUDENT_PAGE_SIZE]
        students = [
            StudentOption(id=r["id"], name=r["name"], collegeId=r["program_id"])
            for r in rows
        ]

    contains_synthetic = bool(
        await db.fetchval("SELECT EXISTS (SELECT 1 FROM exams WHERE is_synthetic)")
    )

    return FilterOptionsResponse(
        role=scope.role,
        scopeLevel=scope.scope_level,
        scopeLabel=scope.scope_label,
        visible=visible,
        required=required,
        sectors=sectors,
        colleges=colleges,
        curricula=curricula,
        professors=professors,
        students=students,
        hasMoreStudents=has_more_students,
        studentPageSize=STUDENT_PAGE_SIZE,
        containsSynthetic=contains_synthetic,
    )
