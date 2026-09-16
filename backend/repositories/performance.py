import asyncpg

from core.utils import PASS_MARK, avg, round1
from repositories.sql_filters import attempt_where
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters

EMPTY = {
    "averageByExam": [],
    "highest": {"name": "—", "score": 0, "exam": "—"},
    "lowest": {"name": "—", "score": 0, "exam": "—"},
    "passFail": [],
    "distribution": [],
    "ranked": [],
    "semesterComparison": [],
    "insight": "No attempts in this scope yet.",
    "failCount": 0,
}


async def get_student_performance(
    ctx: UserContext,
    db: asyncpg.Connection,
    filters: AnalyticsFilters | None = None,
):
    filters = filters or AnalyticsFilters()
    where_sql, args, _ = attempt_where(filters)
    participated = f"{where_sql} AND a.participated AND a.score IS NOT NULL"

    exam_rows = await db.fetch(
        f"""
        SELECT
            a.exam_id,
            split_part(a.exam_title, '—', 1) AS exam,
            a.course_code AS course,
            MIN(a.scheduled_at) AS scheduled_at,
            AVG(a.score)::float AS average
        FROM v_exam_attempts a
        WHERE {participated}
        GROUP BY a.exam_id, a.exam_title, a.course_code
        ORDER BY MIN(a.scheduled_at)
        """,
        *args,
    )
    if not exam_rows:
        return EMPTY

    average_by_exam = [
        {"exam": (r["exam"] or "").strip(), "course": r["course"], "average": round1(r["average"])}
        for r in exam_rows
    ]

    extrema = await db.fetchrow(
        f"""
        SELECT
            (ARRAY_AGG(s.name ORDER BY a.score DESC))[1] AS high_name,
            MAX(a.score)::float AS high_score,
            (ARRAY_AGG(a.course_code || ' · ' || split_part(a.exam_title, '—', 1) ORDER BY a.score DESC))[1] AS high_exam,
            (ARRAY_AGG(s.name ORDER BY a.score ASC))[1] AS low_name,
            MIN(a.score)::float AS low_score,
            (ARRAY_AGG(a.course_code || ' · ' || split_part(a.exam_title, '—', 1) ORDER BY a.score ASC))[1] AS low_exam,
            COUNT(*) FILTER (WHERE a.score >= {PASS_MARK}) AS passed,
            COUNT(*) AS total
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
        WHERE {participated}
        """,
        *args,
    )

    dist_rows = await db.fetch(
        f"""
        SELECT bucket, COUNT(*)::int AS students
        FROM (
            SELECT CASE
                WHEN a.score < 40 THEN '0–39'
                WHEN a.score < 50 THEN '40–49'
                WHEN a.score < 60 THEN '50–59'
                WHEN a.score < 70 THEN '60–69'
                WHEN a.score < 80 THEN '70–79'
                WHEN a.score < 90 THEN '80–89'
                ELSE '90–100'
            END AS bucket
            FROM v_exam_attempts a
            WHERE {participated}
        ) d
        GROUP BY bucket
        """,
        *args,
    )
    buckets = ["0–39", "40–49", "50–59", "60–69", "70–79", "80–89", "90–100"]
    dist_map = {r["bucket"]: r["students"] for r in dist_rows}
    distribution = [{"bucket": b, "students": dist_map.get(b, 0)} for b in buckets]

    ranked_rows = await db.fetch(
        f"""
        SELECT
            a.student_id,
            s.name,
            (ARRAY_AGG(a.course_code ORDER BY a.scheduled_at DESC))[1] AS course,
            AVG(a.score)::float AS average,
            MAX(a.score)::float AS best,
            ARRAY_AGG(a.score ORDER BY a.scheduled_at) AS scores
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
        WHERE {participated}
        GROUP BY a.student_id, s.name
        ORDER BY AVG(a.score) DESC
        """,
        *args,
    )
    ranked = []
    fail_count = 0
    for i, r in enumerate(ranked_rows):
        scores = [float(x) for x in (r["scores"] or [])]
        half = max(1, len(scores) // 2)
        trend = round(avg(scores[half:]) - avg(scores[:half])) if len(scores) > 1 else 0
        average = round1(r["average"])
        status = "Pass" if average >= PASS_MARK else "Fail"
        if status == "Fail":
            fail_count += 1
        ranked.append(
            {
                "rank": i + 1,
                "studentId": r["student_id"],
                "name": r["name"],
                "course": r["course"],
                "average": average,
                "best": float(r["best"]),
                "trend": trend,
                "status": status,
            }
        )

    by_course_series: dict[str, list] = {}
    for v in average_by_exam:
        by_course_series.setdefault(v["course"], []).append(v)
    semester_comparison = []
    for course, series in by_course_series.items():
        for i, v in enumerate(series):
            previous = series[i - 1]["average"] if i > 0 else v["average"]
            semester_comparison.append(
                {"exam": v["exam"], "current": v["average"], "previous": previous}
            )

    return {
        "averageByExam": average_by_exam,
        "highest": {
            "name": extrema["high_name"],
            "score": float(extrema["high_score"]),
            "exam": (extrema["high_exam"] or "").strip(),
        },
        "lowest": {
            "name": extrema["low_name"],
            "score": float(extrema["low_score"]),
            "exam": (extrema["low_exam"] or "").strip(),
        },
        "passFail": [
            {"name": "Passed", "value": int(extrema["passed"] or 0)},
            {"name": "Failed", "value": int((extrema["total"] or 0) - (extrema["passed"] or 0))},
        ],
        "distribution": distribution,
        "ranked": ranked,
        "semesterComparison": semester_comparison,
        "insight": "Scores are tracked across all attempts in this scope.",
        "failCount": fail_count,
    }
