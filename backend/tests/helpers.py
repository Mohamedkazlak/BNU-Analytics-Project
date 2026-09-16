from core.authorization import AuthScope
from repositories.accounts import user_context_from_scope
from schemas.auth import UserContext


def make_scope(**overrides) -> AuthScope:
    data = dict(
        user_id="u-sm",
        role="senior_management",
        person_id="p-sm",
        scope_id="uni-bnu",
        scope_level="university",
        student_id=None,
        sector_id=None,
        college_id=None,
        name="President",
        title="President",
        display_role="Senior Management",
        course_ids=[],
    )
    data.update(overrides)
    return AuthScope(**data)


def make_user(scope: AuthScope) -> UserContext:
    return user_context_from_scope(scope)
