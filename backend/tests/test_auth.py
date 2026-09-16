from core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


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


def test_password_hash_is_real_bcrypt_and_verifies():
    hashed = get_password_hash("test-pass")
    assert hashed.startswith("$2")
    assert verify_password("test-pass", hashed)
    assert not verify_password("wrong", hashed)
    assert not verify_password("test-pass", "not-a-hash")


def test_password_hashing_does_not_use_passlib():
    import core.security as security

    source = open(security.__file__).read()
    assert "from passlib" not in source
    assert "import passlib" not in source
    assert "import bcrypt" in source
