"""Backend-enforced chat: role/domain gate ported from the frontend's former
src/lib/ai-scope.ts + src/lib/assistant.functions.ts, but running here where
`ctx.role` comes from the verified JWT (see core/dependencies.get_current_user)
instead of a client-supplied field. `classify()` stays a deterministic,
pre-retrieval permission gate — exactly the shape needed once Phase 3 adds a
document retriever alongside these aggregate answers.
"""

import re
import asyncpg
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
from repositories.accounts import validate_analytics_filters

import repositories.management as mgmt_repo
import repositories.course_performance as course_repo
import repositories.integrity as integrity_repo
import repositories.item_analysis as item_repo
import repositories.performance as perf_repo
import repositories.student as student_repo

DataDomain = str

DOMAIN_ALLOW: dict[str, set[str]] = {
    "student": {"own_performance", "anonymized_cohort"},
    "professor": {
        "own_courses",
        "item_analysis",
        "exam_content",
        "grading_rationale",
        "anonymized_cohort",
        "named_students",
    },
    "it_academic_integrity": {
        "integrity_monitoring",
        "named_students",
        "anonymized_cohort",
        "institution_kpis",
    },
    "academic_affairs": {
        "named_students",
        "anonymized_cohort",
        "own_courses",
        "all_courses",
        "institution_kpis",
        "item_analysis",
    },
    # staffKpiDomains in the original ai-scope.ts
    "program_director": {
        "institution_kpis",
        "all_courses",
        "item_analysis",
        "exam_content",
        "grading_rationale",
        "integrity_monitoring",
        "named_students",
        "anonymized_cohort",
        "own_performance",
    },
    "senior_management": {
        "institution_kpis",
        "all_courses",
        "item_analysis",
        "exam_content",
        "grading_rationale",
        "integrity_monitoring",
        "named_students",
        "anonymized_cohort",
        "own_performance",
    },
}


# Fallback domain per role when no keyword rule matches. This must always be
# a domain present in that role's DOMAIN_ALLOW set below, otherwise the most
# generic, in-scope questions (including this app's own suggested prompts)
# get wrongly refused. "own_courses" used to be a blanket default regardless
# of role, but it isn't in senior_management's or program_director's allow
# set (they only have "all_courses"), so e.g. "Which college is weakest?"
# or "Which curriculum is weakest?" were being refused outright.
_DEFAULT_DOMAIN: dict[str, DataDomain] = {
    "student": "own_performance",
    "professor": "own_courses",
    "academic_affairs": "own_courses",
    "program_director": "all_courses",
    "senior_management": "all_courses",
    "it_academic_integrity": "integrity_monitoring",
}


def classify(question: str, role: str) -> DataDomain:
    q = question.lower()
    asks_about_person = bool(
        re.search(r"\b(who|whose|which student|student s-?\d+|top student|name of)\b", q)
    )
    default = _DEFAULT_DOMAIN.get(role, "own_courses")
    if re.search(r"\b(ip|login|device|anomal|cheat|similar|flag|suspicio|monitor)\b", q):
        return "integrity_monitoring"
    if re.search(r"\b(rubric|marking|grading rationale|model answer|answer key)\b", q):
        return "grading_rationale"
    if re.search(r"\b(question text|item bank|exam content|show me the question)\b", q):
        return "exam_content"
    if re.search(r"\b(discrimination|difficulty|item analysis|distractor)\b", q):
        return "item_analysis"
    if re.search(r"\b(department|platform|institution|university-wide|term kpi)\b", q):
        return "institution_kpis"
    if asks_about_person:
        return "named_students"
    if re.search(r"\b(class average|cohort|compared to others|peers)\b", q):
        return "anonymized_cohort"
    if re.search(r"\b(course|section|exam|curriculum|curricula|college|program)\b", q):
        return default
    return default


def refusal_for(role: str, domain: DataDomain) -> str:
    if role == "student" and domain == "named_students":
        return (
            "I can't share another student's name, score or personal data. I can "
            "compare you against the anonymized class average instead — want that?"
        )
    if role == "professor" and domain == "all_courses":
        return (
            "That covers courses outside the sections assigned to you. Ask your "
            "administrator to enable platform-wide access if you need it."
        )
    if role == "it_academic_integrity" and domain in ("exam_content", "grading_rationale"):
        return (
            "Integrity access covers monitoring signals only — raw exam content "
            "and grading rationale aren't available here."
        )
    return "That data is outside what your role is authorized to see, so I can't answer it."


async def _answer(
    ctx: UserContext, db: asyncpg.Connection, domain: DataDomain, filters: AnalyticsFilters
) -> str:
    role = ctx.role

    if domain == "own_performance" and role == "student":
        d = await student_repo.get_student_dashboard(ctx, db, filters)
        return (
            f"Your average is {d['average']}, versus a class average of {d['classAverage']}. "
            f"Your best topic is {d['bestTopic']}; your weakest is {d['weakestTopic']}."
        )

    if domain == "anonymized_cohort":
        if role == "student":
            d = await student_repo.get_student_dashboard(ctx, db, filters)
            return (
                f"The class average across your exams is {d['classAverage']}; your average "
                f"is {d['average']}. I can only show aggregates here, never individual classmates."
            )
        perf = await perf_repo.get_student_performance(ctx, db, filters)
        if not perf["averageByExam"]:
            return "There are no recorded attempts in this scope yet."
        lo = min(perf["averageByExam"], key=lambda r: r["average"])
        hi = max(perf["averageByExam"], key=lambda r: r["average"])
        return (
            f"Exam averages in this scope range from {lo['average']} ({lo['exam']}) to "
            f"{hi['average']} ({hi['exam']})."
        )

    if domain in ("own_courses", "all_courses"):
        cp = await course_repo.get_course_performance(ctx, db, filters)
        if not cp["averageByCourse"]:
            return "There are no recorded attempts in your courses yet."
        lines = ", ".join(f"{c['course']} averages {c['average']}" for c in cp["averageByCourse"][:4])
        return f"Across the curricula in scope: {lines}."

    if domain == "item_analysis":
        ia = await item_repo.get_item_analysis(ctx, db, filters)
        if not ia["needsReview"]:
            return (
                "No items are flagged right now — either quality looks fine, or no "
                "graded item-level answers are recorded yet."
            )
        top = ia["needsReview"][0]
        return (
            f"The weakest item is question {top['number']} on {top['exam']}, "
            f"discrimination index {top['discriminationIndex']}."
        )

    if domain == "integrity_monitoring":
        ir = await integrity_repo.get_integrity_report(ctx, db, filters)
        if not ir["totalAttempts"]:
            return "There are no monitored attempts in this scope."
        return f"{ir['flaggedCount']} of {ir['totalAttempts']} monitored attempts show at least one anomaly."

    if domain == "institution_kpis":
        mo = await mgmt_repo.get_management_overview(ctx, db, filters)
        kpis = ", ".join(f"{k['label']}: {k['value']}" for k in mo["kpis"])
        return f"{kpis}. {mo['insight']}"

    if domain == "named_students":
        return (
            "I can only summarize named records inside the Student Profiles report, "
            "scoped to your role — open Student Profiles for the individual breakdown."
        )

    if domain == "exam_content":
        return (
            "I can point you to item stems inside Item Analysis for exams in your "
            "scope — open that report for the question text."
        )

    if domain == "grading_rationale":
        return "Grading rubrics live with your course tools; there's no rubric store wired up here yet."

    return "I don't have real data wired up for that question yet."


async def get_chat_answer(ctx: UserContext, db: asyncpg.Connection, question: str) -> dict:
    domain = classify(question, ctx.role)
    allowed = DOMAIN_ALLOW.get(ctx.role, set())
    if domain not in allowed:
        return {"text": refusal_for(ctx.role, domain), "blocked": True}
    filters = await validate_analytics_filters(ctx, db, AnalyticsFilters(), require_complete=False)
    return {"text": await _answer(ctx, db, domain, filters), "blocked": False}
