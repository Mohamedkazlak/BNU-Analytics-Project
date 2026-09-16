from services.predictions import current_standing_from_context


def test_management_output_is_current_standing_not_a_forecast():
    data = {
        "overview": {
            "passRateByCollege": [
                {"college": "Engineering", "passRate": 72, "participants": 80, "courses": 4},
                {"college": "Business", "passRate": 64, "participants": 50, "courses": 3},
            ]
        }
    }
    result = current_standing_from_context("senior_management", data)
    assert result is not None
    assert result["kind"] == "current_standing"
    assert "forecast" not in result["title"].lower()
    assert "prediction" not in result["title"].lower()
    assert "not a forecast" in result["summary"]


def test_empty_scope_returns_nothing_rather_than_inventing_numbers():
    assert current_standing_from_context("senior_management", {"overview": {}}) is None
