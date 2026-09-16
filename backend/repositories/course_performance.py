import asyncpg

from core.utils import PASS_MARK, round1
from repositories.sql_filters import attempt_where
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters


async def get_course_performance(
    ctx: UserContext,
    db: asyncpg.Connection,
    filters: AnalyticsFilters | None = None,
):
    filters = filters or AnalyticsFilters()
    where_sql, args, _ = attempt_where(filters)
    participated = f"{where_sql} AND a.participated AND a.score IS NOT NULL"

    course_rows = await db.fetch(
        f"""
        SELECT
            a.course_code AS course,
            AVG(a.score)::float AS average
        FROM v_exam_attempts a
        WHERE {participated}
        GROUP BY a.course_code
        """,
        *args,
    )
    if not course_rows:
        return {
            "averageByCourse": [],
            "sections": [],
            "assignedCourses": [],
            "insight": "No section rows in this scope yet.",
        }

    average_by_course = []
    for r in course_rows:
        mean = float(r["average"])
        average_by_course.append(
            {
                "course": r["course"],
                "average": round1(mean),
                "quality": round(min(10, max(1, mean / 10 + 0.6)), 1),
            }
        )

    section_rows = await db.fetch(
        f"""
        SELECT
            a.course_code AS course,
            s.section,
            AVG(a.score)::float AS average,
            COUNT(*) FILTER (WHERE a.score >= {PASS_MARK}) AS passed,
            COUNT(*) AS total
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
        WHERE {participated}
        GROUP BY a.course_code, s.section
        """,
        *args,
    )
    sections = [
        {
            "section": f"{r['course']} · {r['section']}",
            "course": r["course"],
            "average": round1(r["average"]),
            "passRate": round1((r["passed"] / r["total"] * 100) if r["total"] else 0),
        }
        for r in section_rows
    ]

    assigned = []
    if ctx.role == "professor" and ctx.person_id:
        assigned_rows = await db.fetch(
            """
            SELECT
                c.id,
                c.code,
                c.name,
                (
                    SELECT COUNT(*)::int
                    FROM enrollments e
                    JOIN course_offerings o ON o.id = e.offering_id
                    WHERE o.course_id = c.id
                ) AS enrolled,
                ARRAY(
                    SELECT DISTINCT cs.code
                    FROM course_sections cs
                    JOIN course_offerings o ON o.id = cs.offering_id
                    WHERE o.course_id = c.id
                    ORDER BY cs.code
                ) AS sections
            FROM courses c
            JOIN staff_course_assignments sca
              ON sca.course_id = c.id AND sca.staff_person_id = $1
            ORDER BY c.code
            """,
            ctx.person_id,
        )
        assigned = [
            {
                "id": r["id"],
                "code": r["code"],
                "name": r["name"],
                "enrolled": r["enrolled"],
                "sections": list(r["sections"] or []),
            }
            for r in assigned_rows
        ]

    weakest = sorted(sections, key=lambda x: x["average"])[0] if sections else None
    insight = (
        f"{weakest['section']} trails other sections in this scope."
        if weakest
        else "No section rows in this scope yet."
    )

    return {
        "averageByCourse": average_by_course,
        "sections": sections,
        "assignedCourses": assigned,
        "insight": insight,
    }
