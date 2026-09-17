import asyncpg

from core.utils import PASS_MARK, avg, round1
from repositories.transcript import build_profile_years
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
from services.gpa import standing_from_gpa

_GENERIC_TOPICS = frozenset({"", "course assessment", "general", "none"})


def use_curriculum_topics(question_topics: list[dict]) -> bool:
    """Question stems in imported exams often share one generic topic label."""
    names = {(row.get("topic") or "").strip().lower() for row in question_topics}
    names.discard("")
    return len(names) < 2 or names <= _GENERIC_TOPICS


def _curriculum_label(code: str | None, name: str | None) -> str:
    code = (code or "").strip()
    name = (name or "").strip()
    if code and name and code not in name:
        return f"{code} · {name}"
    return name or code or "Curriculum"


async def _question_topics(db: asyncpg.Connection, student_id: str) -> list[dict]:
    rows = await db.fetch(
        """
        SELECT q.topic, ROUND(100.0 * AVG(ans.is_correct::int), 1)::float AS score
        FROM attempt_answers ans
        JOIN questions q ON q.id = ans.question_id
        JOIN exam_attempts a ON a.id = ans.attempt_id
        WHERE a.student_id = $1
        GROUP BY q.topic
        ORDER BY 2 DESC
        """,
        student_id,
    )
    return [{"topic": r["topic"], "score": float(r["score"])} for r in rows]


async def _curriculum_topics(db: asyncpg.Connection, student_id: str) -> list[dict]:
    rows = await db.fetch(
        """
        SELECT c.code, c.name, ROUND(AVG(a.score)::numeric, 1)::float AS score
        FROM v_exam_attempts a
        JOIN courses c ON c.id = a.course_id
        WHERE a.student_id = $1 AND a.participated
        GROUP BY c.code, c.name
        ORDER BY 3 DESC, c.code
        """,
        student_id,
    )
    return [
        {
            "topic": _curriculum_label(r["code"], r["name"]),
            "score": float(r["score"]),
        }
        for r in rows
    ]


async def _topics_for_student(db: asyncpg.Connection, student_id: str) -> list[dict]:
    question_topics = await _question_topics(db, student_id)
    curriculum_topics = await _curriculum_topics(db, student_id)
    if use_curriculum_topics(question_topics) and curriculum_topics:
        return curriculum_topics
    return question_topics or curriculum_topics


async def get_student_dashboard(
    ctx: UserContext,
    db: asyncpg.Connection,
    filters: AnalyticsFilters | None = None,
) -> dict:
    student_id = ctx.student_id
    if filters and filters.student_id and ctx.role != "student":
        student_id = filters.student_id
    student = await db.fetchrow(
        """
        SELECT id, name
        FROM v_students
        WHERE id = $1
        """,
        student_id,
    )
    if not student:
        return {
            "studentName": "Unknown",
            "average": 0,
            "classAverage": 0,
            "bestTopic": "None",
            "weakestTopic": "None",
            "scoreTimeline": [],
            "topics": [],
            "insight": "No data found.",
        }

    attempts = await db.fetch(
        """
        SELECT a.exam_id, a.exam_title, a.score, x.scheduled_at
        FROM v_exam_attempts a
        JOIN exams x ON x.id = a.exam_id
        WHERE a.student_id = $1 AND a.participated
        ORDER BY x.scheduled_at ASC
        """,
        student["id"],
    )
    exam_ids = [a["exam_id"] for a in attempts]
    class_avgs = {}
    if exam_ids:
        avgs = await db.fetch(
            "SELECT exam_id, avg_score FROM get_exam_averages($1::text[])",
            exam_ids,
        )
        class_avgs = {r["exam_id"]: r["avg_score"] for r in avgs}

    timeline = []
    student_scores = []
    class_scores = []
    for a in attempts:
        title = (a["exam_title"] or "").split("—")[0].strip()
        score = float(a["score"])
        c_avg = round1(class_avgs.get(a["exam_id"], score))
        student_scores.append(score)
        class_scores.append(c_avg)
        timeline.append(
            {
                "exam": title,
                "date": a["scheduled_at"].isoformat() if a["scheduled_at"] else "",
                "score": score,
                "classAverage": c_avg,
            }
        )

    average = round1(avg(student_scores))
    class_average = round1(avg(class_scores))

    topics = await _topics_for_student(db, student["id"])
    best_topic = topics[0]["topic"] if topics else "None"
    weakest_topic = (
        topics[-1]["topic"]
        if len(topics) > 1
        else (topics[0]["topic"] if topics else "None")
    )

    return {
        "studentName": student["name"],
        "average": average,
        "classAverage": class_average,
        "bestTopic": best_topic,
        "weakestTopic": weakest_topic,
        "scoreTimeline": timeline,
        "topics": topics,
        "insight": (
            f"You are tracking {'above' if average >= class_average else 'below'} the class average."
        ),
    }


async def get_student_profile(
    student_id: str,
    ctx: UserContext,
    db: asyncpg.Connection,
    filters: AnalyticsFilters | None = None,
) -> dict:
    student = await db.fetchrow(
        """
        SELECT id, name, program, section
        FROM v_students
        WHERE id = $1
        """,
        student_id,
    )
    if not student:
        raise Exception("Student not found or not accessible")

    attempts = await db.fetch(
        """
        SELECT a.exam_id, a.exam_title, a.score, x.scheduled_at, c.name as course_name,
               c.code as course_code, a.time_taken_min
        FROM v_exam_attempts a
        JOIN exams x ON x.id = a.exam_id
        JOIN course_offerings o ON o.id = x.offering_id
        JOIN courses c ON c.id = o.course_id
        WHERE a.student_id = $1 AND a.participated = true
        ORDER BY x.scheduled_at DESC
        """,
        student_id,
    )
    scores = [float(a["score"]) for a in attempts]
    overall_from_exams = round1(avg(scores)) if scores else 0.0
    recent = []
    for a in attempts[:5]:
        s = float(a["score"])
        recent.append(
            {
                "exam": a["exam_title"],
                "course": a["course_name"],
                "date": a["scheduled_at"].isoformat() if a["scheduled_at"] else "",
                "score": s,
                "minutes": a["time_taken_min"] or 0,
                "status": "Pass" if s >= PASS_MARK else "Fail",
            }
        )

    attendance_row = await db.fetchrow(
        """
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE participated) AS taken
        FROM v_exam_attempts
        WHERE student_id = $1
        """,
        student_id,
    )
    attendance = (
        round1(attendance_row["taken"] / attendance_row["total"] * 100)
        if attendance_row and attendance_row["total"]
        else 0.0
    )

    transcript = await build_profile_years(db, student_id)
    overall = transcript["overallAverage"] or overall_from_exams
    gpa = transcript["gpa"]
    standing = transcript["standing"] or standing_from_gpa(gpa, overall)

    topics = await _topics_for_student(db, student_id)
    if not topics:
        topics = [{"topic": "General", "score": overall}]

    cohort = await db.fetchrow(
        """
        SELECT COUNT(*)::int AS size
        FROM v_students
        WHERE program = $1
        """,
        student["program"],
    )

    return {
        "studentId": student["id"],
        "name": student["name"],
        "program": student["program"] or "Unknown",
        "section": student["section"] or "A",
        "cohortRank": 1,
        "cohortSize": cohort["size"] if cohort else 0,
        "overallAverage": overall,
        "gpa": gpa,
        "classAverage": overall,
        "attendance": attendance,
        "totalCredits": transcript["totalCredits"],
        "standing": standing,
        "years": transcript["years"],
        "yearTrend": transcript["yearTrend"],
        "courseMatrix": transcript["courseMatrix"],
        "recentAttempts": recent,
        "topics": topics,
        "insight": (
            f"Student is performing at {overall}% average with a cumulative GPA of {gpa}."
        ),
    }
