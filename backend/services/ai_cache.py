"""In-process AI decision cache.

Limitation: this cache is per-process and is not shared across multiple API
workers or hosts. It is appropriate for a single-instance prototype. Do not
use it as a security boundary — cache keys include user_id, role, and scope.
"""

from __future__ import annotations

import time
from typing import Any, Optional

from core.config import settings
from schemas.auth import UserContext
from schemas.filters import AnalyticsFilters

_CACHE: dict[str, tuple[float, Any]] = {}


def make_cache_key(
    ctx: UserContext,
    filters: AnalyticsFilters,
    academic_year_id: str = "",
    term_id: str = "",
    data_version: str = "v1",
) -> str:
    return "|".join(
        [
            ctx.user_id,
            ctx.role,
            ctx.scope_id or "",
            filters.sector_id or "",
            filters.college_id or "",
            filters.curriculum_id or "",
            filters.student_id or "",
            academic_year_id,
            term_id,
            data_version,
        ]
    )


def get(key: str) -> Optional[Any]:
    row = _CACHE.get(key)
    if not row:
        return None
    expires_at, value = row
    if expires_at < time.monotonic():
        _CACHE.pop(key, None)
        return None
    return value


def set(key: str, value: Any, ttl: Optional[int] = None) -> None:
    ttl_seconds = settings.AI_CACHE_TTL_SECONDS if ttl is None else ttl
    _CACHE[key] = (time.monotonic() + ttl_seconds, value)


def clear() -> None:
    _CACHE.clear()
