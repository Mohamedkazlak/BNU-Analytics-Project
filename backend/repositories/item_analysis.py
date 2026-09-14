import asyncpg
from schemas.auth import UserContext
from core.utils import avg, round1, PASS_MARK


async def get_item_analysis(ctx: UserContext, db: asyncpg.Connection):
    # Every answer, tagged with the total score the student got on that exam attempt,
    # so we can split test-takers into top/bottom performers per exam.
    answer_rows = await db.fetch("""
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
    """)

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
