from core.utils import round1
from repositories.sql_filters import student_where
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
from services.gpa import standing_from_gpa
import asyncpg


async def get_student_directory(
    ctx: UserContext,
    db: asyncpg.Connection,
    filters: AnalyticsFilters | None = None,
):
    filters = filters or AnalyticsFilters()
    where_sql, args, _ = student_where(filters)

    rows = await db.fetch(
        f"""
        WITH year_avgs AS (
            SELECT
                t.student_id,
                t.academic_year_id,
                AVG(t.average)::float AS year_avg
            FROM transcript_entries t
            GROUP BY t.student_id, t.academic_year_id
        )
        SELECT
            s.id AS student_id,
            s.name,
            s.program,
            s.section,
            AVG(y.year_avg)::float AS overall,
            (ARRAY_AGG(y.year_avg ORDER BY y.academic_year_id DESC))[1] AS latest,
            (ARRAY_AGG(y.year_avg ORDER BY y.academic_year_id ASC))[1] AS earliest
        FROM v_students s
        JOIN year_avgs y ON y.student_id = s.id
        WHERE {where_sql}
        GROUP BY s.id, s.name, s.program, s.section
        ORDER BY AVG(y.year_avg) DESC
        """,
        *args,
    )

    result = []
    for r in rows:
        overall = round1(r["overall"])
        latest = round1(r["latest"])
        earliest = round1(r["earliest"])
        result.append(
            {
                "studentId": r["student_id"],
                "name": r["name"],
                "program": r["program"],
                "section": r["section"],
                "overallAverage": overall,
                "latestYearAverage": latest,
                "trend": round(latest - earliest) if r["earliest"] is not None else 0,
                "standing": standing_from_gpa(None, latest),
                "status": "Pass" if latest >= 60 else "Fail",
            }
        )
    return result
