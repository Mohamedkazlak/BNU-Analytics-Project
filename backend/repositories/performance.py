import asyncpg
from schemas.auth import UserContext
from core.utils import avg, round1, PASS_MARK


async def get_student_performance(ctx: UserContext, db: asyncpg.Connection):
    rows = await db.fetch("""
        SELECT student_id, name AS student_name, exam_id, exam_title, course_code,
               score, scheduled_at
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
        WHERE a.participated
    """)
    if not rows:
        return {
            "averageByExam": [],
            "highest": {"name": "—", "score": 0, "exam": "—"},
            "lowest": {"name": "—", "score": 0, "exam": "—"},
            "passFail": [],
            "distribution": [],
            "ranked": [],
            "semesterComparison": [],
            "insight": "No attempts in this scope yet.",
        }

    by_exam = {}
    for r in rows:
        by_exam.setdefault(
            r["exam_id"],
            {
                "title": r["exam_title"],
                "course": r["course_code"],
                "scores": [],
                "date": r["scheduled_at"],
            },
        )
        by_exam[r["exam_id"]]["scores"].append(float(r["score"]))
    average_by_exam = sorted(
        [
            {
                "exam": v["title"].split("—")[0].strip(),
                "course": v["course"],
                "average": round1(avg(v["scores"])),
                "date": v["date"],
            }
            for v in by_exam.values()
        ],
        key=lambda x: x["date"],
    )

    top = max(rows, key=lambda r: r["score"])
    bottom = min(rows, key=lambda r: r["score"])

    passed = sum(1 for r in rows if r["score"] >= PASS_MARK)

    buckets = ["0–39", "40–49", "50–59", "60–69", "70–79", "80–89", "90–100"]
    dist = [0] * 7
    for r in rows:
        s = float(r["score"])
        idx = (
            0
            if s < 40
            else (
                1
                if s < 50
                else (
                    2
                    if s < 60
                    else 3 if s < 70 else 4 if s < 80 else 5 if s < 90 else 6
                )
            )
        )
        dist[idx] += 1
    distribution = [{"bucket": b, "students": c} for b, c in zip(buckets, dist)]

    by_student = {}
    for r in rows:
        by_student.setdefault(
            r["student_id"],
            {"name": r["student_name"], "scores": [], "course": r["course_code"]},
        )
        by_student[r["student_id"]]["scores"].append(float(r["score"]))
        by_student[r["student_id"]]["course"] = r["course_code"]
    ranked_raw = []
    for sid, v in by_student.items():
        scores = v["scores"]
        half = max(1, len(scores) // 2)
        trend = round(avg(scores[half:]) - avg(scores[:half])) if len(scores) > 1 else 0
        avg_score = round1(avg(scores))
        ranked_raw.append(
            {
                "studentId": sid,
                "name": v["name"],
                "course": v["course"],
                "average": avg_score,
                "best": max(scores),
                "trend": trend,
                "status": "Pass" if avg_score >= PASS_MARK else "Fail",
            }
        )
    ranked_raw.sort(key=lambda x: -x["average"])
    ranked = [{**r, "rank": i + 1} for i, r in enumerate(ranked_raw)]

    # "previous" = this exam's cohort average one sitting earlier for the same course (real ordering by date),
    # falls back to current when there is no earlier sitting.
    by_course_series = {}
    for v in average_by_exam:
        by_course_series.setdefault(v["course"], []).append(v)
    semester_comparison = []
    for course, series in by_course_series.items():
        for i, v in enumerate(series):
            previous = series[i - 1]["average"] if i > 0 else v["average"]
            semester_comparison.append(
                {"exam": v["exam"], "current": v["average"], "previous": previous}
            )

    insight = (
        "Scores are tracked across all attempts in this scope."
        if len(rows)
        else "No attempts in this scope yet."
    )

    return {
        "averageByExam": [
            {"exam": v["exam"], "course": v["course"], "average": v["average"]}
            for v in average_by_exam
        ],
        "highest": {
            "name": top["student_name"],
            "score": float(top["score"]),
            "exam": f"{top['course_code']} · {top['exam_title'].split('—')[0].strip()}",
        },
        "lowest": {
            "name": bottom["student_name"],
            "score": float(bottom["score"]),
            "exam": f"{bottom['course_code']} · {bottom['exam_title'].split('—')[0].strip()}",
        },
        "passFail": [
            {"name": "Passed", "value": passed},
            {"name": "Failed", "value": len(rows) - passed},
        ],
        "distribution": distribution,
        "ranked": ranked,
        "semesterComparison": semester_comparison,
        "insight": insight,
    }
