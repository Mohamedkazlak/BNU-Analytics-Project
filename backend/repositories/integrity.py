import asyncpg

from repositories.sql_filters import attempt_where
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters


def _short(title: str) -> str:
    return (title or "").split("—")[0].strip()


async def get_integrity_report(
    ctx: UserContext,
    db: asyncpg.Connection,
    filters: AnalyticsFilters | None = None,
):
    filters = filters or AnalyticsFilters()
    where_sql, args, _ = attempt_where(filters)

    rows = await db.fetch(
        f"""
        WITH participated AS (
            SELECT
                a.id,
                a.student_id,
                s.name AS student_name,
                a.exam_id,
                a.exam_title,
                a.course_code,
                a.started_at,
                a.ended_at,
                a.ip,
                a.device,
                a.attempt_count,
                a.late_start,
                a.time_taken_min,
                a.program
            FROM v_exam_attempts a
            JOIN v_students s ON s.id = a.student_id
            WHERE a.participated AND {where_sql}
        ),
        medians AS (
            SELECT exam_id, percentile_cont(0.5) WITHIN GROUP (ORDER BY time_taken_min) AS median_time
            FROM participated
            WHERE time_taken_min IS NOT NULL
            GROUP BY exam_id
        ),
        ip_share AS (
            SELECT exam_id, ip
            FROM participated
            WHERE ip IS NOT NULL AND ip <> ''
            GROUP BY exam_id, ip
            HAVING COUNT(DISTINCT student_id) > 1
        ),
        stored AS (
            SELECT f.attempt_id, ARRAY_AGG(REPLACE(f.flag_type::text, '_', ' ') ORDER BY f.flag_type) AS flags
            FROM integrity_flags f
            JOIN participated p ON p.id = f.attempt_id
            GROUP BY f.attempt_id
        )
        SELECT
            p.*,
            m.median_time,
            (ip.exam_id IS NOT NULL) AS shared_ip,
            COALESCE(st.flags, ARRAY[]::text[]) AS stored_flags
        FROM participated p
        LEFT JOIN medians m ON m.exam_id = p.exam_id
        LEFT JOIN ip_share ip ON ip.exam_id = p.exam_id AND ip.ip = p.ip
        LEFT JOIN stored st ON st.attempt_id = p.id
        ORDER BY p.started_at DESC NULLS LAST
        """,
        *args,
    )

    report_rows = []
    summary_map: dict[str, dict] = {}
    for a in rows:
        flags = [f.title() for f in (a["stored_flags"] or [])]
        if a["attempt_count"] and a["attempt_count"] > 1:
            flags.append(f"{a['attempt_count']} attempts")
        if a["time_taken_min"] is not None and a["median_time"] and a["time_taken_min"] < float(a["median_time"]) * 0.6:
            flags.append("Unusually fast submission")
        elif a["time_taken_min"] is not None and a["time_taken_min"] < 25:
            flags.append("Unusually fast submission")
        if a["late_start"]:
            flags.append("Late start")
        if a["shared_ip"]:
            flags.append("Shared IP address")
        flags = list(dict.fromkeys(flags))
        exam_label = f"{a['course_code']} · {_short(a['exam_title'])}"
        report_rows.append(
            {
                "id": f"{a['exam_id']}-{a['student_id']}",
                "student": a["student_name"],
                "exam": exam_label,
                "startedAt": str(a["started_at"]) if a["started_at"] else "",
                "endedAt": str(a["ended_at"]) if a["ended_at"] else "",
                "ip": a["ip"] or "",
                "device": a["device"] or "",
                "attempts": a["attempt_count"],
                "flags": flags,
            }
        )
        entry = summary_map.setdefault(
            exam_label, {"exam": exam_label, "program": a["program"], "flagged": 0, "total": 0}
        )
        entry["total"] += 1
        if flags:
            entry["flagged"] += 1

    flagged_count = sum(1 for r in report_rows if r["flags"])
    insight = (
        f"{flagged_count} of {len(report_rows)} monitored attempts show at least one anomaly this period."
        if report_rows
        else "No monitored attempts in this scope yet."
    )
    return {
        "rows": report_rows,
        "summary": list(summary_map.values()),
        "flaggedCount": flagged_count,
        "totalAttempts": len(report_rows),
        "insight": insight,
    }


async def get_integrity_counts(
    ctx: UserContext,
    db: asyncpg.Connection,
    filters: AnalyticsFilters | None = None,
) -> dict:
    """Lightweight counts for AI recommendations — no per-attempt payload."""
    report = await get_integrity_report(ctx, db, filters)
    return {
        "flaggedCount": report["flaggedCount"],
        "totalAttempts": report["totalAttempts"],
        "summary": report["summary"],
    }
