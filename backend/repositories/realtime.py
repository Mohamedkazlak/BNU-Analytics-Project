import asyncpg
from schemas.auth import UserContext
from core.utils import avg, round1, PASS_MARK


async def get_real_time_struggling(ctx: UserContext, db: asyncpg.Connection):
    import datetime

    attempts = await db.fetch("""
        SELECT a.student_id, s.name AS student_name, a.course_code, a.score, a.started_at
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
        WHERE a.participated
        ORDER BY a.started_at
    """)
    by_student = {}
    for r in attempts:
        by_student.setdefault(
            r["student_id"],
            {"name": r["student_name"], "course": r["course_code"], "scores": []},
        )
        by_student[r["student_id"]]["scores"].append(float(r["score"]))
        by_student[r["student_id"]]["course"] = r["course_code"]

    students_ranked = []
    for sid, v in by_student.items():
        last = v["scores"][-1]
        mean = avg(v["scores"])
        students_ranked.append(
            {
                "studentId": sid,
                "name": v["name"],
                "course": v["course"],
                "lastScore": last,
                "average": round1(mean),
                "trend": round(last - mean),
                "lastActivity": "recently",
            }
        )
    students_ranked.sort(key=lambda x: x["lastScore"])
    students_ranked = students_ranked[:12]

    live = await db.fetch("""
        SELECT a.exam_id, a.exam_title, a.course_code, a.program, a.sector, a.status,
               a.attempt_count, a.late_start, a.time_taken_min
        FROM v_exam_attempts a
        JOIN exams x ON x.id = a.exam_id
        WHERE x.status IN ('in_progress', 'closing')
    """)
    by_exam = {}
    for r in live:
        e = by_exam.setdefault(
            r["exam_id"],
            {
                "title": r["exam_title"],
                "course": r["course_code"],
                "program": r["program"],
                "sector": r["sector"],
                "rows": [],
            },
        )
        e["rows"].append(r)
    live_exams = []
    for exam_id, v in by_exam.items():
        submitted = sum(1 for r in v["rows"] if r["status"] == "submitted")
        active = sum(1 for r in v["rows"] if r["status"] == "in_progress")
        flagged = sum(
            1
            for r in v["rows"]
            if r["attempt_count"] > 1
            or r["late_start"]
            or (r["time_taken_min"] and r["time_taken_min"] < 25)
        )
        live_exams.append(
            {
                "examId": exam_id,
                "exam": f"{v['course']} · {v['title'].split('—')[0].strip()}",
                "program": v["program"],
                "sector": v["sector"],
                "activeNow": active,
                "submitted": submitted,
                "expected": len(v["rows"]),
                "flagged": flagged,
                "status": (
                    "Closing" if any(r["status"] for r in v["rows"]) else "In progress"
                ),
            }
        )

    active_now = sum(e["activeNow"] for e in live_exams)
    insight = (
        f"Live monitoring covers {len(live_exams)} sittings right now."
        if live_exams
        else "No exams currently in progress in this scope."
    )

    return {
        "students": students_ranked,
        "liveExams": live_exams,
        "updatedAt": datetime.datetime.utcnow().isoformat(),
        "activeNow": active_now,
        "insight": insight,
    }
