import asyncpg

from core.authorization import required_filter_fields, visible_filter_fields
from repositories.accounts import load_auth_scope
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
        if not sector_id and "sector" in visible:
            colleges = []
        else:
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
                FilterOption(id=r["id"], name=r["name"], parentId=r["parent_id"]) for r in rows
            ]

    if "curriculum" in visible:
        college_id = filters.college_id or scope.college_id
        sector_id = filters.sector_id or scope.sector_id
        if scope.role == "professor":
            rows = await db.fetch(
                """
                SELECT c.id, c.code, c.name, c.program_id
                FROM courses c
                JOIN staff_course_assignments sca
                  ON sca.course_id = c.id AND sca.staff_person_id = $1
                ORDER BY c.code
                """,
                scope.person_id,
            )
        elif college_id:
            rows = await db.fetch(
                """
                SELECT c.id, c.code, c.name, c.program_id
                FROM courses c
                WHERE c.program_id = $1
                ORDER BY c.code
                """,
                college_id,
            )
        elif sector_id and scope.role in ("senior_management", "it_academic_integrity"):
            rows = await db.fetch(
                """
                SELECT c.id, c.code, c.name, c.program_id
                FROM courses c
                JOIN org_units p ON p.id = c.program_id
                WHERE p.parent_id = $1
                ORDER BY c.code
                """,
                sector_id,
            )
        else:
            rows = []
        curricula = [
            CurriculumOption(id=r["id"], code=r["code"], name=r["name"], collegeId=r["program_id"])
            for r in rows
        ]

    load_students = "student" in visible and (
        scope.role == "professor"
        or filters.curriculum_id
        or filters.college_id
        or scope.college_id
    )
    if load_students:
        fetch_limit = STUDENT_PAGE_SIZE + 1
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
                  {_student_search_clause("pe", 3)}
                ORDER BY pe.full_name
                LIMIT $4
                """,
                college_id,
                filters.curriculum_id,
                query,
                fetch_limit,
            )
        has_more_students = len(rows) > STUDENT_PAGE_SIZE
        rows = rows[:STUDENT_PAGE_SIZE]
        students = [
            StudentOption(id=r["id"], name=r["name"], collegeId=r["program_id"]) for r in rows
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
        students=students,
        hasMoreStudents=has_more_students,
        studentPageSize=STUDENT_PAGE_SIZE,
        containsSynthetic=contains_synthetic,
    )
