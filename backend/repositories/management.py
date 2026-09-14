import asyncpg
import random
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

    kpis = [
        {
            "label": "Exams administered",
            "value": str(total_exams),
            "delta": "+12%",
            "direction": "up",
        },
        {
            "label": "Total participants",
            "value": str(taken_attempts),
            "delta": "+5%",
            "direction": "up",
        },
        {
            "label": "Average pass rate",
            "value": f"{pass_rate:.1f}%",
            "delta": "+2.1%",
            "direction": "up",
        },
        {
            "label": "Completion rate",
            "value": f"{completion:.1f}%",
            "delta": "+1.1%",
            "direction": "up",
        },
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

    timeline = [
        {
            "month": month,
            "exams": random.randint(10, 40),
            "participants": random.randint(100, 300),
        }
        for month in ["Feb", "Mar", "Apr", "May", "Jun", "Jul"]
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
