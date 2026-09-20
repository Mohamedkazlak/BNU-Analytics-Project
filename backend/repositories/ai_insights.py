import asyncpg

from repositories.sql_filters import attempt_where
from schemas.filters import AnalyticsFilters


async def top_flagged_attempts(
    db: asyncpg.Connection,
    limit: int = 3,
    filters: AnalyticsFilters | None = None,
) -> list[dict]:
    """Top integrity cases ranked in SQL (median timing, shared IP, repeats, late start)."""
    filters = filters or AnalyticsFilters()
    where_sql, args, next_i = attempt_where(filters)
    args.append(limit)
    limit_placeholder = f"${next_i}"

    rows = await db.fetch(
        f"""
        WITH participated AS MATERIALIZED (
            SELECT
                a.id,
                a.student_id,
                a.student_name,
                a.exam_id,
                a.exam_title,
                a.course_code,
                a.time_taken_min,
                a.attempt_count,
                a.late_start,
                a.ip
            FROM v_exam_attempts a
            WHERE a.participated AND {where_sql}
        ),
        medians AS MATERIALIZED (
            SELECT exam_id, percentile_cont(0.5) WITHIN GROUP (ORDER BY time_taken_min) AS median_time
            FROM participated
            WHERE time_taken_min IS NOT NULL
            GROUP BY exam_id
        ),
        ip_share AS MATERIALIZED (
            SELECT exam_id, ip, COUNT(DISTINCT student_id) AS n
            FROM participated
            WHERE ip IS NOT NULL AND ip <> ''
            GROUP BY exam_id, ip
            HAVING COUNT(DISTINCT student_id) > 1
        ),
        scored AS (
            SELECT
                p.*,
                m.median_time,
                ip.n AS ip_peers,
                (
                    (p.time_taken_min IS NOT NULL AND m.median_time IS NOT NULL
                        AND p.time_taken_min < m.median_time * 0.6)::int
                    + (p.attempt_count > 1)::int
                    + (p.late_start)::int
                    + (ip.n IS NOT NULL)::int
                ) AS signal_count
            FROM participated p
            LEFT JOIN medians m ON m.exam_id = p.exam_id
            LEFT JOIN ip_share ip ON ip.exam_id = p.exam_id AND ip.ip = p.ip
        )
        SELECT *
        FROM scored
        WHERE signal_count > 0
        ORDER BY signal_count DESC, student_name
        LIMIT {limit_placeholder}
        """,
        *args,
    )

    cases = []
    for r in rows:
        evidence = []
        if (
            r["time_taken_min"] is not None
            and r["median_time"]
            and r["time_taken_min"] < float(r["median_time"]) * 0.6
        ):
            evidence.append(
                {
                    "label": "Timing anomaly",
                    "detail": (
                        f"Submitted in {r['time_taken_min']} min vs "
                        f"{int(round(float(r['median_time'])))} min cohort median"
                    ),
                }
            )
        if r["attempt_count"] and r["attempt_count"] > 1:
            evidence.append(
                {
                    "label": "Multiple attempts",
                    "detail": f"{r['attempt_count']} attempts recorded on this sitting",
                }
            )
        if r["late_start"]:
            evidence.append(
                {
                    "label": "Late start",
                    "detail": "Started more than 60 minutes after the scheduled open",
                }
            )
        if r["ip_peers"]:
            evidence.append(
                {
                    "label": "IP overlap",
                    "detail": f"Same IP address as {int(r['ip_peers']) - 1} other attempt(s) on this exam",
                }
            )
        if evidence:
            cases.append(
                {
                    "student": r["student_name"],
                    "exam": f"{r['course_code']} · {(r['exam_title'] or '').split('—')[0].strip()}",
                    "evidence": evidence,
                }
            )
    return cases
