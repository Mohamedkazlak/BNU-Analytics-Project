import asyncpg

from core.utils import PASS_MARK
from repositories.sql_filters import attempt_where
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters


async def get_management_overview(
    ctx: UserContext,
    db: asyncpg.Connection,
    filters: AnalyticsFilters | None = None,
) -> dict:
    filters = filters or AnalyticsFilters()
    where_sql, args, _ = attempt_where(filters)

    grain_rows = await db.fetch(
        f"""
        SELECT
            grouping(a.course_code) AS g_course,
            grouping(a.program) AS g_program,
            a.course_code AS course,
            a.program AS college,
            COUNT(*) AS total_attempts,
            COUNT(*) FILTER (WHERE a.status <> 'absent') AS taken_attempts,
            COUNT(*) FILTER (WHERE a.status <> 'absent' AND a.score >= {PASS_MARK}) AS passed_attempts,
            COUNT(DISTINCT a.exam_id) AS total_exams,
            COUNT(DISTINCT a.course_id) AS courses
        FROM v_exam_attempts a
        WHERE {where_sql}
        GROUP BY GROUPING SETS ((a.course_code), (a.program), ())
        """,
        *args,
    )

    stats = next(
        (r for r in grain_rows if r["g_course"] == 1 and r["g_program"] == 1),
        None,
    )
    taken_attempts = (stats["taken_attempts"] if stats else 0) or 0
    total_attempts = (stats["total_attempts"] if stats else 0) or 0
    passed_attempts = (stats["passed_attempts"] if stats else 0) or 0
    total_exams = (stats["total_exams"] if stats else 0) or 0
    pass_rate = (passed_attempts / taken_attempts * 100) if taken_attempts else 0
    completion = (taken_attempts / total_attempts * 100) if total_attempts else 0

    kpis = [
        {"label": "Exams administered", "value": str(total_exams)},
        {"label": "Total participants", "value": str(taken_attempts)},
        {"label": "Average pass rate", "value": f"{pass_rate:.1f}%"},
        {"label": "Completion rate", "value": f"{completion:.1f}%"},
    ]

    pass_rate_by_course = [
        {
            "course": r["course"],
            "passRate": round(
                (r["passed_attempts"] / r["taken_attempts"] * 100)
                if r["taken_attempts"]
                else 0,
                1,
            ),
            "participants": r["taken_attempts"],
        }
        for r in grain_rows
        if r["g_course"] == 0
    ]
    pass_rate_by_college = [
        {
            "college": r["college"],
            "passRate": round(
                (r["passed_attempts"] / r["taken_attempts"] * 100)
                if r["taken_attempts"]
                else 0,
                1,
            ),
            "participants": r["taken_attempts"],
            "courses": r["courses"],
        }
        for r in grain_rows
        if r["g_program"] == 0
    ]

    timeline_where, timeline_args, next_i = attempt_where(filters, start=1, alias="a")
    student_clause = ""
    if filters.student_id:
        student_clause = f" AND (a.student_id = ${next_i} OR a.student_id IS NULL)"
        # student filter already in timeline_where via alias a on left join
    timeline_rows = await db.fetch(
        f"""
        SELECT
            to_char(date_trunc('month', x.scheduled_at), 'Mon') AS month,
            extract(month FROM x.scheduled_at)::int AS month_num,
            count(DISTINCT x.id) AS exams,
            count(*) FILTER (WHERE a.status <> 'absent') AS participants
        FROM exams x
        JOIN course_offerings o ON o.id = x.offering_id
        JOIN courses c ON c.id = o.course_id
        JOIN org_units p ON p.id = c.program_id
        JOIN org_units sec ON sec.id = p.parent_id
        LEFT JOIN exam_attempts a ON a.exam_id = x.id
        WHERE ($1::text IS NULL OR sec.id = $1)
          AND ($2::text IS NULL OR p.id = $2)
          AND ($3::text IS NULL OR c.id = $3)
          AND ($4::text IS NULL OR a.student_id = $4)
          AND (
            $5::text IS NULL
            OR EXISTS (
              SELECT 1 FROM staff_course_assignments sca
              WHERE sca.staff_person_id = $5 AND sca.course_id = c.id
            )
          )
        GROUP BY 1, 2
        ORDER BY 2
        """,
        filters.sector_id,
        filters.college_id,
        filters.curriculum_id,
        filters.student_id,
        filters.professor_id,
    )
    timeline = [
        {"month": r["month"], "exams": r["exams"], "participants": r["participants"]}
        for r in timeline_rows
    ]

    if not pass_rate_by_college:
        insight = "No exam attempts in this scope yet."
    elif len(pass_rate_by_college) == 1:
        only = pass_rate_by_college[0]
        insight = (
            f"{only['college']} pass rate is {only['passRate']}% across "
            f"{only['courses']} courses in this view."
        )
    else:
        weakest = min(pass_rate_by_college, key=lambda r: r["passRate"])
        strongest = max(pass_rate_by_college, key=lambda r: r["passRate"])
        insight = (
            f"{weakest['college']} is the weakest college in this view at "
            f"{weakest['passRate']}%, while {strongest['college']} leads at "
            f"{strongest['passRate']}%."
        )

    contains_synthetic = bool(
        await db.fetchval(
            f"""
            SELECT EXISTS (
              SELECT 1
              FROM v_exam_attempts a
              JOIN exams x ON x.id = a.exam_id
              WHERE ({where_sql}) AND x.is_synthetic
            )
            """,
            *args,
        )
    )

    return {
        "kpis": kpis,
        "passRateByCourse": pass_rate_by_course,
        "passRateByCollege": pass_rate_by_college,
        "activityTrend": timeline,
        "insight": insight,
        "containsSynthetic": contains_synthetic,
    }
