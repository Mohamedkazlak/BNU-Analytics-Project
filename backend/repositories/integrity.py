import asyncpg
from schemas.auth import UserContext
from core.utils import avg, round1, PASS_MARK


async def get_integrity_report(ctx: UserContext, db: asyncpg.Connection):
    attempts = await db.fetch("""
        SELECT a.id, a.student_id, s.name AS student_name, a.exam_id, a.exam_title, a.course_code,
               a.started_at, a.ended_at, a.ip, a.device, a.attempt_count, a.late_start,
               a.time_taken_min, a.program
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
        WHERE a.participated
    """)
    real_flags = await db.fetch("""
        SELECT attempt_id, flag_type, detail FROM integrity_flags
    """)
    flags_by_attempt = {}
    for f in real_flags:
        flags_by_attempt.setdefault(f["attempt_id"], []).append(
            f["flag_type"].replace("_", " ").title()
        )

    # Shared IP: same exam, same IP, 2+ different students.
    ip_groups = {}
    for a in attempts:
        if a["ip"]:
            ip_groups.setdefault((a["exam_id"], a["ip"]), set()).add(a["student_id"])
    shared_ip_keys = {k for k, students in ip_groups.items() if len(students) > 1}

    rows = []
    for a in attempts:
        flags = list(flags_by_attempt.get(a["id"], []))
        if a["attempt_count"] > 1:
            flags.append(f"{a['attempt_count']} attempts")
        if a["time_taken_min"] is not None and a["time_taken_min"] < 25:
            flags.append("Unusually fast submission")
        if a["late_start"]:
            flags.append("Late start")
        if (a["exam_id"], a["ip"]) in shared_ip_keys:
            flags.append("Shared IP address")
        rows.append(
            {
                "id": f"{a['exam_id']}-{a['student_id']}",
                "student": a["student_name"],
                "exam": f"{a['course_code']} · {a['exam_title'].split('—')[0].strip()}",
                "startedAt": str(a["started_at"]) if a["started_at"] else "",
                "endedAt": str(a["ended_at"]) if a["ended_at"] else "",
                "ip": a["ip"] or "",
                "device": a["device"] or "",
                "attempts": a["attempt_count"],
                "flags": list(dict.fromkeys(flags)),  # dedupe, keep order
            }
        )

    flagged_count = sum(1 for r in rows if r["flags"])

    by_exam = {}
    for a, r in zip(attempts, rows):
        entry = by_exam.setdefault(
            r["exam"], {"program": a["program"], "flagged": 0, "total": 0}
        )
        entry["total"] += 1
        if r["flags"]:
            entry["flagged"] += 1
    summary = [{"exam": exam, **v} for exam, v in by_exam.items()]

    insight = (
        f"{flagged_count} of {len(rows)} monitored attempts show at least one anomaly this period."
        if rows
        else "No monitored attempts in this scope yet."
    )

    return {
        "rows": rows,
        "summary": summary,
        "flaggedCount": flagged_count,
        "totalAttempts": len(rows),
        "insight": insight,
    }
