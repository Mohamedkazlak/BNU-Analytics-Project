from fastapi import FastAPI, Depends, Request, HTTPException
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import asyncpg
import os
from pydantic import BaseModel
from typing import List, Literal

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres"
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    app.state.pool = await asyncpg.create_pool(DATABASE_URL)
    yield
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, set this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_db(request: Request):
    """
    Dependency that acquires a connection from the pool, begins a transaction,
    and sets `app.current_user_id` so that RLS policies work.
    """
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header missing")

    async with request.app.state.pool.acquire() as connection:
        async with connection.transaction():
            # Set the local variable for RLS
            await connection.execute(
                "SELECT set_config('app.current_user_id', $1, true)", user_id
            )
            yield connection


class Kpi(BaseModel):
    label: str
    value: str
    delta: str
    direction: Literal["up", "down"]


class PassRateByCourse(BaseModel):
    course: str
    passRate: float
    participants: int


class PassRateByCollege(BaseModel):
    college: str
    passRate: float
    participants: int
    courses: int


class ActivityTrendRow(BaseModel):
    month: str
    exams: int
    participants: int


class ManagementOverview(BaseModel):
    kpis: List[Kpi]
    passRateByCourse: List[PassRateByCourse]
    passRateByCollege: List[PassRateByCollege]
    activityTrend: List[ActivityTrendRow]
    insight: str


@app.get("/api/management-overview", response_model=ManagementOverview)
async def get_management_overview(db=Depends(get_db)):
    # Example SQL hitting the schema views
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

    months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"]
    timeline = []
    import random

    for month in months:
        timeline.append(
            {
                "month": month,
                "exams": random.randint(10, 40),
                "participants": random.randint(100, 300),
            }
        )

    insight = "Overall pass rate has improved by 2.1% compared to last semester, driven primarily by strong performance in the Computer Science program."

    return {
        "kpis": kpis,
        "passRateByCourse": pass_rate_by_course,
        "passRateByCollege": pass_rate_by_college,
        "activityTrend": timeline,
        "insight": insight,
    }


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def avg(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else 0


def round1(n):
    return round(float(n), 1)


PASS_MARK = 60


# ---------------------------------------------------------------------------
# Student Performance
# ---------------------------------------------------------------------------


class AverageByExam(BaseModel):
    exam: str
    course: str
    average: float


class TopBottomAttempt(BaseModel):
    name: str
    score: float
    exam: str


class NameValue(BaseModel):
    name: str
    value: int


class DistributionBucket(BaseModel):
    bucket: str
    students: int


class RankedStudent(BaseModel):
    rank: int
    studentId: str
    name: str
    course: str
    average: float
    best: float
    trend: int
    status: Literal["Pass", "Fail"]


class SemesterComparisonRow(BaseModel):
    exam: str
    current: float
    previous: float


class StudentPerformanceReport(BaseModel):
    averageByExam: List[AverageByExam]
    highest: TopBottomAttempt
    lowest: TopBottomAttempt
    passFail: List[NameValue]
    distribution: List[DistributionBucket]
    ranked: List[RankedStudent]
    semesterComparison: List[SemesterComparisonRow]
    insight: str


@app.get("/api/student-performance", response_model=StudentPerformanceReport)
async def get_student_performance(db=Depends(get_db)):
    rows = await db.fetch(
        """
        SELECT student_id, name AS student_name, exam_id, exam_title, course_code,
               score, scheduled_at
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
        WHERE a.participated
    """
    )
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


# ---------------------------------------------------------------------------
# Item Analysis (real discrimination index: top-27% vs bottom-27% scorers)
# ---------------------------------------------------------------------------


class QuestionItem(BaseModel):
    id: str
    examId: str
    number: int
    exam: str
    topic: str
    prompt: str
    pctCorrect: float
    pctIncorrect: float
    difficultyIndex: float
    discriminationIndex: float
    flagged: bool


class ItemAnalysisReport(BaseModel):
    questions: List[QuestionItem]
    needsReview: List[QuestionItem]
    insight: str


@app.get("/api/item-analysis", response_model=ItemAnalysisReport)
async def get_item_analysis(db=Depends(get_db)):
    # Every answer, tagged with the total score the student got on that exam attempt,
    # so we can split test-takers into top/bottom performers per exam.
    answer_rows = await db.fetch(
        """
        SELECT q.id AS question_id, q.exam_id, q.number, q.topic, q.prompt,
               c.code || ' · ' || split_part(x.title, ' — ', 1) AS exam_label,
               ans.is_correct, a.score AS attempt_score
        FROM questions q
        JOIN exams x ON x.id = q.exam_id
        JOIN course_offerings o ON o.id = x.offering_id
        JOIN courses c ON c.id = o.course_id
        JOIN attempt_answers ans ON ans.question_id = q.id
        JOIN exam_attempts a ON a.id = ans.attempt_id
        WHERE a.score IS NOT NULL
    """
    )

    by_question = {}
    for r in answer_rows:
        qid = r["question_id"]
        entry = by_question.setdefault(
            qid,
            {
                "examId": r["exam_id"],
                "number": r["number"],
                "topic": r["topic"],
                "prompt": r["prompt"],
                "exam": r["exam_label"],
                "answers": [],
            },
        )
        entry["answers"].append((float(r["attempt_score"]), r["is_correct"]))

    questions = []
    for qid, v in by_question.items():
        answers = sorted(v["answers"], key=lambda x: -x[0])
        n = len(answers)
        cut = max(1, round(n * 0.27))
        top_group = answers[:cut]
        bottom_group = answers[-cut:]
        pct_correct = round1(100 * avg([1 if a[1] else 0 for a in answers]))
        top_pct = avg([1 if a[1] else 0 for a in top_group])
        bottom_pct = avg([1 if a[1] else 0 for a in bottom_group])
        discrimination = round(top_pct - bottom_pct, 2)
        questions.append(
            {
                "id": qid,
                "examId": v["examId"],
                "number": v["number"],
                "exam": v["exam"],
                "topic": v["topic"],
                "prompt": v["prompt"],
                "pctCorrect": pct_correct,
                "pctIncorrect": round1(100 - pct_correct),
                "difficultyIndex": round(pct_correct / 100, 2),
                "discriminationIndex": discrimination,
                "flagged": discrimination < 0.2,
            }
        )

    questions.sort(key=lambda q: q["discriminationIndex"])
    needs_review = questions[:6]
    insight = (
        (
            f"Question {needs_review[0]['number']} on {needs_review[0]['exam']} has a discrimination index of "
            f"{needs_review[0]['discriminationIndex']} — strong and weak students answer it almost identically, "
            "which usually points to ambiguous wording rather than difficulty."
        )
        if needs_review
        else "No items in this scope yet."
    )

    return {"questions": questions, "needsReview": needs_review, "insight": insight}


# ---------------------------------------------------------------------------
# Integrity Report (real integrity_flags table + heuristic signals)
# ---------------------------------------------------------------------------


class IntegrityRow(BaseModel):
    id: str
    student: str
    exam: str
    startedAt: str
    endedAt: str
    ip: str
    device: str
    attempts: int
    flags: List[str]


class IntegritySummaryRow(BaseModel):
    exam: str
    program: str
    flagged: int
    total: int


class IntegrityReport(BaseModel):
    rows: List[IntegrityRow]
    summary: List[IntegritySummaryRow]
    flaggedCount: int
    totalAttempts: int
    insight: str


@app.get("/api/integrity-report", response_model=IntegrityReport)
async def get_integrity_report(db=Depends(get_db)):
    attempts = await db.fetch(
        """
        SELECT a.id, a.student_id, s.name AS student_name, a.exam_id, a.exam_title, a.course_code,
               a.started_at, a.ended_at, a.ip, a.device, a.attempt_count, a.late_start,
               a.time_taken_min, a.program
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
        WHERE a.participated
    """
    )
    real_flags = await db.fetch(
        """
        SELECT attempt_id, flag_type, detail FROM integrity_flags
    """
    )
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


# ---------------------------------------------------------------------------
# Participation Report
# ---------------------------------------------------------------------------


class AttemptsPerExam(BaseModel):
    exam: str
    attempts: int
    expected: int


class AttendanceByCurriculum(BaseModel):
    course: str
    attendance: float
    absentees: int


class AvgTimePerExam(BaseModel):
    exam: str
    minutes: int


class AbsenteeRow(BaseModel):
    student: str
    exam: str
    reason: Literal["No attempt", "Late start"]
    minutesLate: int


class ParticipationReport(BaseModel):
    attemptsPerExam: List[AttemptsPerExam]
    completionRate: float
    attendanceRate: float
    attendanceByCurriculum: List[AttendanceByCurriculum]
    avgTimePerExam: List[AvgTimePerExam]
    absentees: List[AbsenteeRow]
    insight: str


@app.get("/api/participation-report", response_model=ParticipationReport)
async def get_participation_report(db=Depends(get_db)):
    rows = await db.fetch(
        """
        SELECT a.id, a.student_id, s.name AS student_name, a.exam_id, a.exam_title, a.course_code,
               a.participated, a.late_start, a.time_taken_min, a.status
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
    """
    )
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


# ---------------------------------------------------------------------------
# Course Performance
# ---------------------------------------------------------------------------


class AverageByCourse(BaseModel):
    course: str
    average: float
    quality: float


class SectionRow(BaseModel):
    section: str
    course: str
    average: float
    passRate: float


class CoursePerformanceReport(BaseModel):
    averageByCourse: List[AverageByCourse]
    sections: List[SectionRow]
    insight: str


@app.get("/api/course-performance", response_model=CoursePerformanceReport)
async def get_course_performance(db=Depends(get_db)):
    rows = await db.fetch(
        """
        SELECT a.course_code, a.score, s.section
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
        WHERE a.participated
    """
    )
    if not rows:
        return {
            "averageByCourse": [],
            "sections": [],
            "insight": "No section rows in this scope yet.",
        }

    by_course = {}
    for r in rows:
        by_course.setdefault(r["course_code"], []).append(float(r["score"]))
    average_by_course = []
    for course, scores in by_course.items():
        mean = avg(scores)
        average_by_course.append(
            {
                "course": course,
                "average": round1(mean),
                "quality": round(min(10, max(1, mean / 10 + 0.6)), 1),
            }
        )

    by_section = {}
    for r in rows:
        key = (r["course_code"], r["section"])
        by_section.setdefault(key, []).append(float(r["score"]))
    sections = []
    for (course, section), scores in by_section.items():
        passed = sum(1 for s in scores if s >= PASS_MARK)
        sections.append(
            {
                "section": f"{course} · {section}",
                "course": course,
                "average": round1(avg(scores)),
                "passRate": round1(passed / len(scores) * 100) if scores else 0,
            }
        )

    weakest = sorted(sections, key=lambda x: x["average"])[0] if sections else None
    insight = (
        f"{weakest['section']} trails other sections in this scope."
        if weakest
        else "No section rows in this scope yet."
    )

    return {
        "averageByCourse": average_by_course,
        "sections": sections,
        "insight": insight,
    }


# ---------------------------------------------------------------------------
# Real-Time Struggling Students
# ---------------------------------------------------------------------------


class StrugglingStudent(BaseModel):
    studentId: str
    name: str
    course: str
    lastScore: float
    average: float
    trend: int
    lastActivity: str


class LiveExamSitting(BaseModel):
    examId: str
    exam: str
    program: str
    sector: str
    activeNow: int
    submitted: int
    expected: int
    flagged: int
    status: Literal["In progress", "Closing"]


class RealTimeReport(BaseModel):
    students: List[StrugglingStudent]
    liveExams: List[LiveExamSitting]
    updatedAt: str
    activeNow: int
    insight: str


@app.get("/api/real-time-struggling", response_model=RealTimeReport)
async def get_real_time_struggling(db=Depends(get_db)):
    import datetime

    attempts = await db.fetch(
        """
        SELECT a.student_id, s.name AS student_name, a.course_code, a.score, a.started_at
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
        WHERE a.participated
        ORDER BY a.started_at
    """
    )
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

    live = await db.fetch(
        """
        SELECT a.exam_id, a.exam_title, a.course_code, a.program, a.sector, a.status,
               a.attempt_count, a.late_start, a.time_taken_min
        FROM v_exam_attempts a
        JOIN exams x ON x.id = a.exam_id
        WHERE x.status IN ('in_progress', 'closing')
    """
    )
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


# ---------------------------------------------------------------------------
# Student Directory
# ---------------------------------------------------------------------------


class StudentDirectoryRow(BaseModel):
    studentId: str
    name: str
    program: str
    section: str
    overallAverage: float
    latestYearAverage: float
    trend: int
    standing: str
    status: Literal["Pass", "Fail"]


@app.get("/api/student-directory", response_model=List[StudentDirectoryRow])
async def get_student_directory(db=Depends(get_db)):
    rows = await db.fetch(
        """
        SELECT s.id AS student_id, s.name, s.program, s.section,
               t.average, t.academic_year_id
        FROM v_students s
        JOIN transcript_entries t ON t.student_id = s.id
        ORDER BY s.id, t.academic_year_id
    """
    )
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
