"""Shared analytics snapshot for one AI decision request.

Loads only the datasets required for the authenticated role so insight,
current-standing, and recommendations share one query pass.
"""

from __future__ import annotations

from typing import Any

import asyncpg

from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters
import repositories.management as mgmt_repo
import repositories.course_performance as course_repo
import repositories.participation as part_repo
import repositories.integrity as integrity_repo
import repositories.item_analysis as item_repo
import repositories.performance as perf_repo
import repositories.student as student_repo
import repositories.ai_insights as ai_repo


async def load_ai_context(
    ctx: UserContext,
    db: asyncpg.Connection,
    filters: AnalyticsFilters,
) -> dict[str, Any]:
    role = ctx.role
    data: dict[str, Any] = {"role": role, "filters": filters}

    if role == "student":
        data["dashboard"] = await student_repo.get_student_dashboard(ctx, db, filters)
        return data

    if role in ("senior_management", "program_director"):
        data["overview"] = await mgmt_repo.get_management_overview(ctx, db, filters)
        if role == "senior_management":
            data["integrity"] = await integrity_repo.get_integrity_counts(ctx, db, filters)
        else:
            data["items"] = await item_repo.get_item_analysis(ctx, db, filters)
        return data

    if role == "academic_affairs":
        data["participation"] = await part_repo.get_participation_report(ctx, db, filters)
        data["performance"] = await perf_repo.get_student_performance(ctx, db, filters)
        return data

    if role == "professor":
        data["courses"] = await course_repo.get_course_performance(ctx, db, filters)
        data["participation"] = await part_repo.get_participation_report(ctx, db, filters)
        data["items"] = await item_repo.get_item_analysis(ctx, db, filters)
        return data

    if role == "it_academic_integrity":
        data["integrity"] = await integrity_repo.get_integrity_report(ctx, db, filters)
        data["flagged"] = await ai_repo.top_flagged_attempts(db, limit=3, filters=filters)
        return data

    return data
