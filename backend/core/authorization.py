from dataclasses import dataclass, field
from typing import Optional

from fastapi import HTTPException

from schemas.filters import AnalyticsFilters


@dataclass
class AuthScope:
    user_id: str
    role: str
    person_id: str
    scope_id: Optional[str]
    scope_level: Optional[str]
    student_id: Optional[str]
    sector_id: Optional[str]
    college_id: Optional[str]
    name: str = ""
    title: str = ""
    display_role: str = ""
    university_name: str = "Benha National University"
    sector_name: Optional[str] = None
    college_name: Optional[str] = None
    scope_label: str = ""
    course_ids: list[str] = field(default_factory=list)


def visible_filter_fields(scope: AuthScope) -> list[str]:
    role = scope.role
    if role == "student":
        return []
    if role == "professor":
        return ["curriculum", "student"]
    if role in ("program_director", "academic_affairs"):
        return ["curriculum", "professor", "student"]
    if role == "it_academic_integrity":
        return ["sector", "college", "curriculum"]
    if role == "senior_management" and scope.scope_level == "sector":
        return ["college", "professor"]
    if role == "senior_management":
        return ["sector", "college", "professor"]
    return ["sector", "college", "curriculum", "student"]


def required_filter_fields(scope: AuthScope) -> list[str]:
    return []


def apply_scope_defaults(scope: AuthScope, filters: AnalyticsFilters) -> AnalyticsFilters:
    """Narrow omitted filters to the caller's authorized scope. Never expands."""
    data = filters.model_dump()
    if scope.role == "student" and scope.student_id:
        data["student_id"] = scope.student_id
    if scope.role == "senior_management" and scope.scope_level == "sector" and scope.sector_id:
        if not data["sector_id"]:
            data["sector_id"] = scope.sector_id
    if scope.role in ("program_director", "academic_affairs") and scope.college_id:
        if not data["college_id"]:
            data["college_id"] = scope.college_id
        if not data["sector_id"] and scope.sector_id:
            data["sector_id"] = scope.sector_id
    return AnalyticsFilters(**data)


def assert_filters_in_scope(scope: AuthScope, filters: AnalyticsFilters, require_complete: bool = True) -> None:
    """Pure authorization check (no DB). Raises HTTPException on violation."""
    role = scope.role

    if role == "student":
        if filters.student_id and scope.student_id and filters.student_id != scope.student_id:
            raise HTTPException(status_code=403, detail="Students may only query their own record")
        return

    if require_complete:
        required = required_filter_fields(scope)
        if "sectorId" in required and not filters.sector_id:
            raise HTTPException(status_code=400, detail="sectorId is required")
        if "collegeId" in required and not filters.college_id:
            raise HTTPException(status_code=400, detail="collegeId is required")

    if role == "senior_management" and scope.scope_level == "sector":
        if filters.sector_id and scope.sector_id and filters.sector_id != scope.sector_id:
            raise HTTPException(status_code=403, detail="Sector filter is outside your authorized sector")
        if filters.college_id and scope.sector_id and filters.sector_id and filters.sector_id != scope.sector_id:
            raise HTTPException(status_code=403, detail="College filter is outside your authorized sector")

    if role in ("program_director", "academic_affairs"):
        if filters.college_id and scope.college_id and filters.college_id != scope.college_id:
            raise HTTPException(status_code=403, detail="College filter is outside your authorized program")
        if filters.sector_id and scope.sector_id and filters.sector_id != scope.sector_id:
            raise HTTPException(status_code=403, detail="Sector filter is outside your authorized program")

    if role == "professor":
        if filters.curriculum_id and filters.curriculum_id not in scope.course_ids:
            raise HTTPException(status_code=403, detail="Curriculum is not in your assigned teaching scope")
        if filters.professor_id and scope.person_id and filters.professor_id != scope.person_id:
            raise HTTPException(status_code=403, detail="Professor filter is outside your teaching scope")
