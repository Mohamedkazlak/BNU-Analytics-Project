import asyncpg
from schemas.auth import UserContext
from core.utils import avg, round1, PASS_MARK


async def get_course_performance(ctx: UserContext, db: asyncpg.Connection):
    rows = await db.fetch("""
        SELECT a.course_code, a.score, s.section
        FROM v_exam_attempts a
        JOIN v_students s ON s.id = a.student_id
        WHERE a.participated
    """)
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
