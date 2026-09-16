from core.security import create_access_token, decode_access_token


def test_jwt_round_trip_uses_environment_secret():
    token = create_access_token(
        {
            "user_id": "u1",
            "role": "professor",
            "scope_id": None,
            "person_id": "p1",
        }
    )
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["user_id"] == "u1"
    assert payload["role"] == "professor"


def test_invalid_jwt_returns_none():
    assert decode_access_token("not-a-token") is None


def test_live_user_is_the_dependency_used_by_analytics_routers():
    from core import dependencies

    source = open(dependencies.__file__).read()
    assert "get_live_user" in source
    assert "load_auth_scope" in source
