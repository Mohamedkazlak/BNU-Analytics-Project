import asyncpg
from schemas.auth import UserContext
from core.utils import avg, round1, PASS_MARK


async def get_participation_report(ctx: UserContext, db: asyncpg.Connection):
    rows = await db.fetch("""
        SELECT a.id, a.student_id, s.name AS student_name, a.exam_id, a.exam_title, a.course_code,
               a.participated, a.late_start, a.time_taken_min, a.status
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
    """)
    if not rows:
        return {
            "attemptsPerExam": [],
            "completionRate": 0,
            "attendanceRate": 0,
            "attendanceByCurriculum": [],
            "avgTimePerExam": [],
            "absentees": [],
            "insight": "No attendance rows in this scope yet.",
        }

    by_exam = {}
    for r in rows:
        e = by_exam.setdefault(
            r["exam_id"],
            {"title": r["exam_title"], "course": r["course_code"], "rows": []},
        )
        e["rows"].append(r)
    attempts_per_exam = [
        {
            "exam": v["title"].split("—")[0].strip(),
            "attempts": sum(1 for r in v["rows"] if r["participated"]),
            "expected": len(v["rows"]),
        }
        for v in by_exam.values()
    ]
    avg_time_per_exam = [
        {
            "exam": v["title"].split("—")[0].strip(),
            "minutes": round(
                avg(
                    [
                        r["time_taken_min"]
                        for r in v["rows"]
                        if r["participated"] and r["time_taken_min"]
                    ]
                )
            ),
        }
        for v in by_exam.values()
    ]

    taken = [r for r in rows if r["participated"]]
    completion_rate = round1(len(taken) / len(rows) * 100) if rows else 0

    by_course = {}
    for r in rows:
        c = by_course.setdefault(r["course_code"], [])
        c.append(r)
    attendance_by_curriculum = []
    for course, course_rows in by_course.items():
        present = sum(
            1 for r in course_rows if r["participated"] and not r["late_start"]
        )
        absent = sum(1 for r in course_rows if not r["participated"])
        attendance_by_curriculum.append(
            {
                "course": course,
                "attendance": (
                    round1(present / len(course_rows) * 100) if course_rows else 0
                ),
                "absentees": absent,
            }
        )
    attendance_rate = round1(avg([r["attendance"] for r in attendance_by_curriculum]))

    absentees = [
        {
            "student": r["student_name"],
            "exam": f"{r['course_code']} · {r['exam_title'].split('—')[0].strip()}",
            "reason": "Late start" if r["participated"] else "No attempt",
            "minutesLate": 0,
        }
        for r in rows
        if (not r["participated"] or r["late_start"])
    ][:12]

    weakest = (
        sorted(attendance_by_curriculum, key=lambda x: x["attendance"])[0]
        if attendance_by_curriculum
        else None
    )
    insight = (
        f"{weakest['course']} has the weakest attendance at {weakest['attendance']}%."
        if weakest
        else "No attendance rows in this scope yet."
    )

    return {
        "attemptsPerExam": attempts_per_exam,
        "completionRate": completion_rate,
        "attendanceRate": attendance_rate,
        "attendanceByCurriculum": attendance_by_curriculum,
        "avgTimePerExam": avg_time_per_exam,
        "absentees": absentees,
        "insight": insight,
    }
