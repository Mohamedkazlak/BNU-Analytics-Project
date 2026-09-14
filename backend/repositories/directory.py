import asyncpg
from schemas.auth import UserContext
from core.utils import avg, round1, PASS_MARK


async def get_student_directory(ctx: UserContext, db: asyncpg.Connection):
    rows = await db.fetch("""
        SELECT s.id AS student_id, s.name, s.program, s.section,
               t.average, t.academic_year_id
        FROM v_students s
        JOIN transcript_entries t ON t.student_id = s.id
        ORDER BY s.id, t.academic_year_id
    """)
    by_student = {}
    for r in rows:
        e = by_student.setdefault(
            r["student_id"],
            {
                "name": r["name"],
                "program": r["program"],
                "section": r["section"],
                "years": [],
            },
        )
        e["years"].append(float(r["average"]))

    def standing_for(avg_score: float) -> str:
        if avg_score >= 85:
            return "Dean's List"
        if avg_score >= PASS_MARK:
            return "Good Standing"
        return "Academic Probation"

    result = []
    for sid, v in by_student.items():
        years = v["years"]
        overall = round1(avg(years))
        latest = round1(years[-1])
        result.append(
            {
                "studentId": sid,
                "name": v["name"],
                "program": v["program"],
                "section": v["section"],
                "overallAverage": overall,
                "latestYearAverage": latest,
                "trend": round(years[-1] - years[0]) if len(years) > 1 else 0,
                "standing": standing_for(latest),
                "status": "Pass" if latest >= PASS_MARK else "Fail",
            }
        )
    result.sort(key=lambda x: -x["overallAverage"])
    return result
