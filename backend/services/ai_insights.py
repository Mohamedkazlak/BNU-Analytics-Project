"""Phase 1 AI layer: real numbers from the existing (already scope-filtered,
RLS-backed) repositories, plugged into narrative templates. No LLM call yet —
see backend/core/llm_client.py (Phase 2) for where generation will attach.

Every headline/body/row here must trace back to a real row returned by one
of the repositories/*.py modules already used by the dashboards. Where the
underlying data doesn't exist yet (e.g. attempt_answers is currently empty,
so item-level analysis has nothing to show), we say so explicitly instead of
inventing a plausible-looking number.
"""

import asyncpg
from schemas.auth import UserContext
from core.utils import PASS_MARK

import repositories.management as mgmt_repo
import repositories.course_performance as course_repo
import repositories.participation as part_repo
import repositories.integrity as integrity_repo
import repositories.item_analysis as item_repo
import repositories.performance as perf_repo
import repositories.student as student_repo
import repositories.ai_insights as ai_repo


def _tone_for(value: float, benchmark: float) -> str:
    if value >= benchmark:
        return "mint"
    if value <= benchmark - 5:
        return "rose"
    return "amber"


# ---------------------------------------------------------------------------
# Insight
# ---------------------------------------------------------------------------

async def get_insight(ctx: UserContext, db: asyncpg.Connection) -> dict | None:
    role = ctx.role

    if role == "student":
        # No LLM/topic-level data to generate a narrative from yet — the
        # frontend already shows the real dashboard numbers directly.
        return None

    if role in ("senior_management", "program_director"):
        overview = await mgmt_repo.get_management_overview(ctx, db)
        colleges = overview["passRateByCollege"]
        courses = overview["passRateByCourse"]
        if not colleges:
            return {
                "headline": "No exam data in this scope yet",
                "body": "There are no recorded attempts in this scope yet, so there is nothing to report on.",
                "action": None,
            }
        weakest = min(colleges, key=lambda c: c["passRate"])
        weakest_course = min(courses, key=lambda c: c["passRate"]) if courses else None
        if len(colleges) == 1:
            headline = f"{weakest['college']} pass rate is {weakest['passRate']}%"
            body = (
                f"{weakest['college']} spans {weakest['courses']} curricula with "
                f"{weakest['participants']} recorded participants this term, at a "
                f"{weakest['passRate']}% pass rate."
            )
        else:
            headline = f"{weakest['college']} has the lowest pass rate in this view"
            body = (
                f"Across the {len(colleges)} colleges in this view, {weakest['college']} sits at "
                f"{weakest['passRate']}% pass — the lowest here, from {weakest['participants']} "
                "recorded attempts."
            )
        if weakest_course:
            body += (
                f" The weakest curriculum overall is {weakest_course['course']} at "
                f"{weakest_course['passRate']}% pass."
            )
        return {
            "headline": headline,
            "body": body,
            "action": {"label": "Drill into curricula", "to": "/courses"},
        }

    if role == "academic_affairs":
        participation = await part_repo.get_participation_report(ctx, db)
        performance = await perf_repo.get_student_performance(ctx, db)
        curricula = participation["attendanceByCurriculum"]
        weakest_att = min(curricula, key=lambda c: c["attendance"]) if curricula else None
        below_pass = [r for r in performance["ranked"] if r["status"] == "Fail"]
        if not weakest_att and not below_pass:
            return {
                "headline": "No performance data in this scope yet",
                "body": "There are no recorded attempts in this college yet.",
                "action": None,
            }
        parts = []
        if below_pass:
            parts.append(
                f"{len(below_pass)} student(s) are currently below the {PASS_MARK}% pass mark"
            )
        if weakest_att:
            parts.append(
                f"{weakest_att['course']} has the weakest attendance in the college at "
                f"{weakest_att['attendance']}%"
            )
        body = ". ".join(p[0].upper() + p[1:] for p in parts) + "."
        headline = (
            f"{len(below_pass)} students below the pass mark this term"
            if below_pass
            else f"{weakest_att['course']} attendance needs attention"
        )
        warnings = []
        if below_pass:
            warnings.append({
                "id": "w1",
                "text": f"{len(below_pass)} students below pass mark — follow up this week",
                "tone": "rose",
            })
        if weakest_att:
            warnings.append({
                "id": "w2",
                "text": f"{weakest_att['course']} attendance {weakest_att['attendance']}%",
                "tone": "amber",
            })
        return {
            "headline": headline,
            "body": body,
            "action": {"label": "Open student performance", "to": "/performance"},
            "warnings": warnings or None,
        }

    if role == "professor":
        sections = (await course_repo.get_course_performance(ctx, db))["sections"]
        participation = await part_repo.get_participation_report(ctx, db)
        items = await item_repo.get_item_analysis(ctx, db)
        if not sections:
            return {
                "headline": "No exam data in this scope yet",
                "body": "There are no recorded attempts in your assigned curricula yet.",
                "action": None,
            }
        weakest_section = min(sections, key=lambda s: s["average"])
        strongest_section = max(sections, key=lambda s: s["average"])
        gap = round(strongest_section["average"] - weakest_section["average"], 1)
        if gap > 0 and weakest_section["section"] != strongest_section["section"]:
            body = (
                f"{weakest_section['section']} averages {weakest_section['average']}, "
                f"{gap} points behind {strongest_section['section']} at "
                f"{strongest_section['average']} on the same curriculum."
            )
            headline = f"{weakest_section['section']} trails {strongest_section['section']} by {gap} points"
        else:
            body = f"{weakest_section['section']} averages {weakest_section['average']} across your curricula."
            headline = f"{weakest_section['section']} is your current baseline section"
        needs_review = items["needsReview"]
        if needs_review:
            top = needs_review[0]
            body += (
                f" {top['exam']} question {top['number']} has a discrimination index of "
                f"{top['discriminationIndex']}, the weakest in your curricula."
            )
        else:
            body += " No graded item-level answers are recorded yet, so item analysis has nothing to flag."
        warnings = []
        curricula = participation["attendanceByCurriculum"]
        weakest_att = min(curricula, key=lambda c: c["attendance"]) if curricula else None
        if weakest_att and weakest_att["attendance"] < 90:
            warnings.append({
                "id": "w1",
                "text": f"{weakest_att['course']} attendance is {weakest_att['attendance']}%",
                "tone": "amber",
            })
        return {
            "headline": headline,
            "body": body,
            "action": {"label": "Compare sections", "to": "/performance"},
            "warnings": warnings or None,
        }

    if role == "it_academic_integrity":
        report = await integrity_repo.get_integrity_report(ctx, db)
        cases_raw = await ai_repo.top_flagged_attempts(db, limit=3)
        if not cases_raw:
            return {
                "headline": "No flagged attempts right now",
                "body": "No monitored attempts in this scope currently show anomalies.",
                "action": None,
            }
        cases = []
        for i, c in enumerate(cases_raw):
            n = len(c["evidence"])
            share = round(100 / n)
            evidence = [{**e, "weight": share} for e in c["evidence"]]
            score = min(100, share * n)
            level = "High" if n >= 3 else "Medium" if n == 2 else "Low"
            cases.append({
                "id": f"case-{i + 1}",
                "subject": c["student"],
                "exam": c["exam"],
                "level": level,
                "score": score,
                "evidence": evidence,
            })
        top = cases_raw[0]
        top_flags = ", ".join(e["label"] for e in top["evidence"]).lower()
        return {
            "headline": f"{report['flaggedCount']} of {report['totalAttempts']} monitored attempts flagged",
            "body": (
                f"{report['flaggedCount']} attempts in this scope show at least one anomaly. "
                f"The highest-signal case is {top['student']} on {top['exam']}, flagged for {top_flags}."
            ),
            "action": {"label": "Open case detail", "to": "/integrity"},
            "cases": cases,
        }

    return None


# ---------------------------------------------------------------------------
# Prediction — no multi-term history exists yet, so this reports the real
# CURRENT standing (ranked, weakest first) rather than a fabricated forecast.
# ---------------------------------------------------------------------------

async def get_prediction(ctx: UserContext, db: asyncpg.Connection) -> dict | None:
    role = ctx.role
    summary_note = (
        "No multi-term history is recorded yet to project a trend, so this is the "
        "real current-term standing, not a forecast."
    )

    if role == "student":
        return None

    if role in ("senior_management", "program_director"):
        overview = await mgmt_repo.get_management_overview(ctx, db)
        colleges = overview["passRateByCollege"]
        if not colleges:
            return None
        overall = sum(c["passRate"] for c in colleges) / len(colleges)
        ranked = sorted(colleges, key=lambda c: c["passRate"])[:3]
        rows = [
            {
                "label": c["college"],
                "value": f"{c['passRate']}% pass",
                "tone": _tone_for(c["passRate"], overall),
            }
            for c in ranked
        ]
        return {
            "title": "Current standing · colleges in scope",
            "direction": "stable",
            "summary": summary_note,
            "rows": rows,
            "action": {"label": "Open curriculum view", "to": "/courses"},
        }

    if role == "academic_affairs":
        participation = await part_repo.get_participation_report(ctx, db)
        curricula = participation["attendanceByCurriculum"]
        if not curricula:
            return None
        overall = participation["attendanceRate"]
        ranked = sorted(curricula, key=lambda c: c["attendance"])[:3]
        rows = [
            {
                "label": c["course"],
                "value": f"{c['attendance']}% attendance",
                "tone": _tone_for(c["attendance"], overall),
            }
            for c in ranked
        ]
        return {
            "title": "Current standing · attendance by curriculum",
            "direction": "stable",
            "summary": summary_note,
            "rows": rows,
            "action": {"label": "Open attendance", "to": "/participation"},
        }

    if role == "professor":
        sections = (await course_repo.get_course_performance(ctx, db))["sections"]
        if not sections:
            return None
        overall = sum(s["average"] for s in sections) / len(sections)
        ranked = sorted(sections, key=lambda s: s["average"])[:3]
        rows = [
            {
                "label": s["section"],
                "value": f"{s['average']} avg · {s['passRate']}% pass",
                "tone": _tone_for(s["average"], overall),
            }
            for s in ranked
        ]
        return {
            "title": "Current standing · your sections",
            "direction": "stable",
            "summary": summary_note,
            "rows": rows,
            "action": {"label": "Open curriculum view", "to": "/courses"},
        }

    if role == "it_academic_integrity":
        report = await integrity_repo.get_integrity_report(ctx, db)
        summary_rows = report["summary"]
        if not summary_rows:
            return None
        ranked = sorted(
            summary_rows,
            key=lambda s: (s["flagged"] / s["total"]) if s["total"] else 0,
            reverse=True,
        )[:3]
        rows = [
            {
                "label": s["exam"],
                "value": f"{s['flagged']}/{s['total']} flagged",
                "tone": "rose" if s["total"] and s["flagged"] / s["total"] > 0.2 else "amber",
            }
            for s in ranked
        ]
        return {
            "title": "Current standing · flagged share by exam",
            "direction": "stable",
            "summary": summary_note,
            "rows": rows,
            "action": {"label": "Open live monitoring", "to": "/real-time"},
        }

    return None


# ---------------------------------------------------------------------------
# Recommendations — built from the same real numbers as the insight/
# prediction above. `action` blocks are UI navigation wiring (route +
# confirmation copy), not data claims, so they stay static per role like the
# rest of the app's routing.
# ---------------------------------------------------------------------------

async def get_recommendations(
    ctx: UserContext, db: asyncpg.Connection, insight_id: str
) -> dict | None:
    role = ctx.role
    items: list[dict] = []

    if role == "student":
        dashboard = await student_repo.get_student_dashboard(ctx, db)
        timeline = dashboard["scoreTimeline"]
        if timeline:
            worst = min(timeline, key=lambda r: r["score"])
            delta = round(dashboard["average"] - dashboard["classAverage"], 1)
            items.append({
                "id": "s1",
                "kind": "guidance" if delta >= 0 else "action",
                "text": (
                    f"Your average is {dashboard['average']}, "
                    f"{'above' if delta >= 0 else 'below'} the class average of "
                    f"{dashboard['classAverage']} by {abs(delta)} points"
                ),
                "basedOn": {
                    "source": "Your real score history",
                    "evidence": [
                        {"label": "Your average", "detail": f"{dashboard['average']}"},
                        {"label": "Class average", "detail": f"{dashboard['classAverage']}"},
                    ],
                },
                "action": None,
            })
            items.append({
                "id": "s2",
                "kind": "guidance",
                "text": f"Your weakest recorded exam is {worst['exam']} at {worst['score']}",
                "basedOn": {
                    "source": "Your real score timeline",
                    "evidence": [
                        {"label": worst["exam"], "detail": f"Score {worst['score']} vs class {worst['classAverage']}"},
                    ],
                },
                "action": {
                    "label": "Open my progress",
                    "to": "/my-progress",
                    "confirmTitle": "Open your progress page?",
                    "confirmBody": "Opens your personal dashboard for this exam.",
                    "confirmLabel": "Open",
                },
            })
        return {"insightId": insight_id, "items": items} if items else None

    if role in ("senior_management", "program_director"):
        overview = await mgmt_repo.get_management_overview(ctx, db)
        colleges = overview["passRateByCollege"]
        if colleges:
            weakest = min(colleges, key=lambda c: c["passRate"])
            items.append({
                "id": "m1",
                "kind": "action",
                "text": f"{weakest['college']} pass rate is {weakest['passRate']}% — review curriculum calibration",
                "basedOn": {
                    "source": "Current pass rate by college",
                    "evidence": [
                        {"label": weakest["college"], "detail": f"{weakest['passRate']}% pass, {weakest['participants']} participants"},
                    ],
                },
                "action": {
                    "label": "Open curriculum drill-down",
                    "to": "/courses",
                    "confirmTitle": f"Open the {weakest['college']} drill-down?",
                    "confirmBody": "Opens the curriculum performance view filtered to this college. Nothing is shared externally.",
                    "confirmLabel": "Open drill-down",
                },
            })
        if role == "senior_management":
            integrity = await integrity_repo.get_integrity_report(ctx, db)
            if integrity["totalAttempts"]:
                items.append({
                    "id": "m2",
                    "kind": "action" if integrity["flaggedCount"] else "guidance",
                    "text": f"{integrity['flaggedCount']} of {integrity['totalAttempts']} monitored attempts are flagged",
                    "basedOn": {
                        "source": "Current integrity monitoring",
                        "evidence": [
                            {"label": "Flagged", "detail": f"{integrity['flaggedCount']} of {integrity['totalAttempts']} attempts"},
                        ],
                    },
                    "action": {
                        "label": "Open case list",
                        "to": "/integrity",
                        "confirmTitle": "Open the case list?",
                        "confirmBody": "Opens the monitoring log. No case status changes.",
                        "confirmLabel": "Open case list",
                    } if integrity["flaggedCount"] else None,
                })
        else:
            items_report = await item_repo.get_item_analysis(ctx, db)
            if items_report["needsReview"]:
                top = items_report["needsReview"][0]
                items.append({
                    "id": "p2",
                    "kind": "action",
                    "text": f"{top['exam']} question {top['number']} flagged — schedule an item review with faculty",
                    "basedOn": {
                        "source": "Current item analysis",
                        "evidence": [
                            {"label": f"Q{top['number']}", "detail": f"Discrimination {top['discriminationIndex']}"},
                        ],
                    },
                    "action": {
                        "label": "Open item analysis",
                        "to": "/item-analysis",
                        "confirmTitle": "Open item analysis?",
                        "confirmBody": "Opens item analysis for flagged questions. No items are published or retired.",
                        "confirmLabel": "Open",
                    },
                })
        return {"insightId": insight_id, "items": items} if items else None

    if role == "academic_affairs":
        performance = await perf_repo.get_student_performance(ctx, db)
        participation = await part_repo.get_participation_report(ctx, db)
        below_pass = [r for r in performance["ranked"] if r["status"] == "Fail"]
        if below_pass:
            items.append({
                "id": "a1",
                "kind": "action",
                "text": f"Follow up with {len(below_pass)} student(s) below the pass mark",
                "basedOn": {
                    "source": "Current student performance",
                    "evidence": [{"label": "Below pass", "detail": f"{len(below_pass)} students this term"}],
                },
                "action": {
                    "label": "Open student performance",
                    "to": "/performance",
                    "confirmTitle": "Open student performance?",
                    "confirmBody": "Opens the college performance view. No messages are sent to students.",
                    "confirmLabel": "Open",
                },
            })
        curricula = participation["attendanceByCurriculum"]
        if curricula:
            weakest_att = min(curricula, key=lambda c: c["attendance"])
            items.append({
                "id": "a2",
                "kind": "action",
                "text": f"Review {weakest_att['course']} attendance ({weakest_att['attendance']}%)",
                "basedOn": {
                    "source": "Current attendance by curriculum",
                    "evidence": [{"label": weakest_att["course"], "detail": f"{weakest_att['attendance']}% attendance"}],
                },
                "action": {
                    "label": "Open attendance",
                    "to": "/participation",
                    "confirmTitle": "Open attendance?",
                    "confirmBody": "Opens participation and attendance for every curriculum in the college.",
                    "confirmLabel": "Open",
                },
            })
        return {"insightId": insight_id, "items": items} if items else None

    if role == "professor":
        sections = (await course_repo.get_course_performance(ctx, db))["sections"]
        items_report = await item_repo.get_item_analysis(ctx, db)
        if sections:
            weakest_section = min(sections, key=lambda s: s["average"])
            items.append({
                "id": "f1",
                "kind": "action",
                "text": f"{weakest_section['section']} averages {weakest_section['average']} — consider a review session",
                "basedOn": {
                    "source": "Current section performance",
                    "evidence": [{"label": weakest_section["section"], "detail": f"{weakest_section['average']} avg, {weakest_section['passRate']}% pass"}],
                },
                "action": {
                    "label": "Compare sections",
                    "to": "/performance",
                    "confirmTitle": "Open the section comparison?",
                    "confirmBody": "This opens section performance for your curricula. No message is sent to students.",
                    "confirmLabel": "Open comparison",
                },
            })
        if items_report["needsReview"]:
            top = items_report["needsReview"][0]
            items.append({
                "id": "f2",
                "kind": "action",
                "text": f"Question {top['number']} on {top['exam']} flagged for review — low discrimination index",
                "basedOn": {
                    "source": "Current item analysis",
                    "evidence": [{"label": f"Q{top['number']}", "detail": f"Discrimination {top['discriminationIndex']}"}],
                },
                "action": {
                    "label": "Open in Item Analysis",
                    "to": "/item-analysis",
                    "confirmTitle": "Open the flagged question?",
                    "confirmBody": "Item Analysis opens filtered to this question. Nothing is changed or published.",
                    "confirmLabel": "Open question",
                },
            })
        return {"insightId": insight_id, "items": items} if items else None

    if role == "it_academic_integrity":
        report = await integrity_repo.get_integrity_report(ctx, db)
        cases_raw = await ai_repo.top_flagged_attempts(db, limit=1)
        if cases_raw:
            top = cases_raw[0]
            items.append({
                "id": "i1",
                "kind": "action",
                "text": f"Recommended for review: {top['student']} / {top['exam']}",
                "basedOn": {
                    "source": f"Fused from {len(top['evidence'])} real signal(s)",
                    "evidence": top["evidence"],
                },
                "action": {
                    "label": "Create case",
                    "to": "/integrity",
                    "confirmTitle": "Create an investigation case?",
                    "confirmBody": "Opens the case with the evidence above pre-attached and marked recommended for review. No finding is recorded and no one is notified.",
                    "confirmLabel": "Create case",
                },
            })
        if report["totalAttempts"]:
            items.append({
                "id": "i2",
                "kind": "guidance",
                "text": f"{report['flaggedCount']} of {report['totalAttempts']} monitored attempts are currently flagged",
                "basedOn": {
                    "source": "Current integrity monitoring",
                    "evidence": [{"label": "Flagged", "detail": f"{report['flaggedCount']} of {report['totalAttempts']}"}],
                },
                "action": None,
            })
        return {"insightId": insight_id, "items": items} if items else None

    return None
