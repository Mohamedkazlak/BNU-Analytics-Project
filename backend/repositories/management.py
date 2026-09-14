import asyncpg
from schemas.auth import UserContext


async def get_management_overview(ctx: UserContext, db: asyncpg.Connection) -> dict:
    query = """
    SELECT 
        COUNT(*) AS total_attempts,
        COUNT(*) FILTER (WHERE status <> 'absent') AS taken_attempts,
        COUNT(*) FILTER (WHERE status <> 'absent' AND score >= 60) AS passed_attempts,
        COUNT(DISTINCT exam_id) AS total_exams
    FROM v_exam_attempts;
    """
    stats = await db.fetchrow(query)

    total_attempts = stats["total_attempts"]
    taken_attempts = stats["taken_attempts"]
    passed_attempts = stats["passed_attempts"]
    total_exams = stats["total_exams"]

    pass_rate = (passed_attempts / taken_attempts * 100) if taken_attempts else 0
    completion = (taken_attempts / total_attempts * 100) if total_attempts else 0

    # No prior term exists in the data yet (course_offerings only has
    # current-term rows), so we report the real value only and leave
    # delta/direction unset rather than fabricate a trend. Once a prior
    # term's exam_attempts are available, compute a real comparison here.
    kpis = [
        {"label": "Exams administered", "value": str(total_exams)},
        {"label": "Total participants", "value": str(taken_attempts)},
        {"label": "Average pass rate", "value": f"{pass_rate:.1f}%"},
        {"label": "Completion rate", "value": f"{completion:.1f}%"},
    ]

    course_query = """
    SELECT 
        course_code AS course,
        COUNT(*) FILTER (WHERE status <> 'absent' AND score >= 60) AS passed,
        COUNT(*) FILTER (WHERE status <> 'absent') AS participants
    FROM v_exam_attempts
    GROUP BY course_code;
    """
    course_rows = await db.fetch(course_query)
    pass_rate_by_course = [
        {
            "course": r["course"],
            "passRate": round(
                (r["passed"] / r["participants"] * 100) if r["participants"] else 0, 1
            ),
            "participants": r["participants"],
        }
        for r in course_rows
    ]

    college_query = """
    SELECT 
        program AS college,
        COUNT(*) FILTER (WHERE status <> 'absent' AND score >= 60) AS passed,
        COUNT(*) FILTER (WHERE status <> 'absent') AS participants,
        COUNT(DISTINCT course_id) AS courses
    FROM v_exam_attempts
    GROUP BY program;
    """
    college_rows = await db.fetch(college_query)
    pass_rate_by_college = [
        {
            "college": r["college"],
            "passRate": round(
                (r["passed"] / r["participants"] * 100) if r["participants"] else 0, 1
            ),
            "participants": r["participants"],
            "courses": r["courses"],
        }
        for r in college_rows
    ]

    # Real month-by-month activity from actual exam schedule/attempt dates
    # (previously random.randint() placeholders).
    timeline_query = """
    SELECT
        to_char(date_trunc('month', x.scheduled_at), 'Mon') AS month,
        extract(month FROM x.scheduled_at)::int AS month_num,
        count(DISTINCT x.id) AS exams,
        count(*) FILTER (WHERE a.status <> 'absent') AS participants
    FROM exams x
    LEFT JOIN exam_attempts a ON a.exam_id = x.id
    GROUP BY 1, 2
    ORDER BY 2;
    """
    timeline_rows = await db.fetch(timeline_query)
    timeline = [
        {
            "month": r["month"],
            "exams": r["exams"],
            "participants": r["participants"],
        }
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

    return {
        "kpis": kpis,
        "passRateByCourse": pass_rate_by_course,
        "passRateByCollege": pass_rate_by_college,
        "activityTrend": timeline,
        "insight": insight,
    }
