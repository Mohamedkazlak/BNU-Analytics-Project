import asyncpg


async def top_flagged_attempts(db: asyncpg.Connection, limit: int = 3) -> list[dict]:
    """Real per-attempt integrity evidence (timing vs cohort median, repeat
    attempts, late starts, shared IPs) — same heuristics as
    repositories/integrity.py, but keeping the underlying numbers so callers
    can cite them (e.g. "14 min vs 41 min cohort median") instead of just a
    flag label. RLS on v_exam_attempts already scopes the rows to what this
    session may see.
    """
    rows = await db.fetch("""
        SELECT a.id, a.student_id, s.name AS student_name, a.exam_id, a.exam_title,
               a.course_code, a.time_taken_min, a.attempt_count, a.late_start, a.ip
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
        WHERE a.participated
    """)

    by_exam_times: dict[str, list[int]] = {}
    for r in rows:
        by_exam_times.setdefault(r["exam_id"], []).append(r["time_taken_min"] or 0)

    ip_groups: dict[tuple[str, str], set[str]] = {}
    for r in rows:
        if r["ip"]:
            ip_groups.setdefault((r["exam_id"], r["ip"]), set()).add(r["student_id"])
    shared_ip_keys = {k for k, students in ip_groups.items() if len(students) > 1}

    cases = []
    for r in rows:
        evidence = []
        times = sorted(by_exam_times.get(r["exam_id"], []))
        median_time = times[len(times) // 2] if times else 0
        if r["time_taken_min"] and median_time and r["time_taken_min"] < median_time * 0.6:
            evidence.append({
                "label": "Timing anomaly",
                "detail": f"Submitted in {r['time_taken_min']} min vs {median_time} min cohort median",
            })
        if r["attempt_count"] > 1:
            evidence.append({
                "label": "Multiple attempts",
                "detail": f"{r['attempt_count']} attempts recorded on this sitting",
            })
        if r["late_start"]:
            evidence.append({
                "label": "Late start",
                "detail": "Started more than 60 minutes after the scheduled open",
            })
        key = (r["exam_id"], r["ip"])
        if key in shared_ip_keys:
            overlap = len(ip_groups[key]) - 1
            evidence.append({
                "label": "IP overlap",
                "detail": f"Same IP address as {overlap} other attempt(s) on this exam",
            })
        if evidence:
            cases.append({
                "student": r["student_name"],
                "exam": f"{r['course_code']} · {r['exam_title'].split('—')[0].strip()}",
                "evidence": evidence,
            })

    cases.sort(key=lambda c: -len(c["evidence"]))
    return cases[:limit]
