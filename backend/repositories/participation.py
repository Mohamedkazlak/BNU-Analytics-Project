import asyncpg

from core.utils import avg, round1
from repositories.sql_filters import attempt_where
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters


async def get_participation_report(
    ctx: UserContext,
    db: asyncpg.Connection,
    filters: AnalyticsFilters | None = None,
):
    filters = filters or AnalyticsFilters()
    where_sql, args, _ = attempt_where(filters)

    exam_rows = await db.fetch(
        f"""
        SELECT
            split_part(a.exam_title, '—', 1) AS exam,
            COUNT(*) FILTER (WHERE a.participated) AS attempts,
            COUNT(*) AS expected,
            COALESCE(AVG(a.time_taken_min) FILTER (WHERE a.participated AND a.time_taken_min IS NOT NULL), 0) AS minutes
        FROM v_exam_attempts a
        WHERE {where_sql}
        GROUP BY a.exam_id, a.exam_title
        """,
        *args,
    )
    if not exam_rows:
        return {
            "attemptsPerExam": [],
            "completionRate": 0,
            "attendanceRate": 0,
            "attendanceByCurriculum": [],
            "avgTimePerExam": [],
            "absentees": [],
            "insight": "No attendance rows in this scope yet.",
        }

    attempts_per_exam = [
        {"exam": (r["exam"] or "").strip(), "attempts": int(r["attempts"]), "expected": int(r["expected"])}
        for r in exam_rows
    ]
    avg_time_per_exam = [
        {"exam": (r["exam"] or "").strip(), "minutes": round(float(r["minutes"]))}
        for r in exam_rows
    ]

    totals = await db.fetchrow(
        f"""
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE a.participated) AS taken
        FROM v_exam_attempts a
        WHERE {where_sql}
        """,
        *args,
    )
    completion_rate = round1((totals["taken"] / totals["total"] * 100) if totals["total"] else 0)

    course_rows = await db.fetch(
        f"""
        SELECT
            a.course_code AS course,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE a.participated AND NOT a.late_start) AS present,
            COUNT(*) FILTER (WHERE NOT a.participated) AS absentees
        FROM v_exam_attempts a
        WHERE {where_sql}
        GROUP BY a.course_code
        """,
        *args,
    )
    attendance_by_curriculum = [
        {
            "course": r["course"],
            "attendance": round1((r["present"] / r["total"] * 100) if r["total"] else 0),
            "absentees": int(r["absentees"]),
        }
        for r in course_rows
    ]
    attendance_rate = round1(avg([r["attendance"] for r in attendance_by_curriculum]))

    absentee_rows = await db.fetch(
        f"""
        SELECT
            s.name AS student,
            a.course_code || ' · ' || split_part(a.exam_title, '—', 1) AS exam,
            CASE WHEN a.participated THEN 'Late start' ELSE 'No attempt' END AS reason
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
        WHERE {where_sql}
          AND (NOT a.participated OR a.late_start)
        ORDER BY s.name
        LIMIT 12
        """,
        *args,
    )
    absentees = [
        {
            "student": r["student"],
            "exam": (r["exam"] or "").strip(),
            "reason": r["reason"],
            "minutesLate": 0,
        }
        for r in absentee_rows
    ]

    weakest = (
        sorted(attendance_by_curriculum, key=lambda x: x["attendance"])[0]
        if attendance_by_curriculum
        else None
    )
    insight = (
        f"{weakest['course']} has the weakest attendance at {weakest['attendance']}%."
        if weakest
        else "No attendance rows in this scope yet."
    )

    return {
        "attemptsPerExam": attempts_per_exam,
        "completionRate": completion_rate,
        "attendanceRate": attendance_rate,
        "attendanceByCurriculum": attendance_by_curriculum,
        "avgTimePerExam": avg_time_per_exam,
        "absentees": absentees,
        "insight": insight,
    }
