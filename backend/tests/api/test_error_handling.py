from fastapi.testclient import TestClient


def test_validation_error_format_and_clean_path(client: TestClient):
    # Missing required denominator
    payload = {
        "system": {
            "type": "tf",
            "numerator": [1.0],
        }
    }
    response = client.post("/api/v1/control/nyquist", json=payload)
    assert response.status_code == 422

    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "message" in data["error"]
    assert "fields" in data["error"]

    fields = data["error"]["fields"]
    assert len(fields) > 0
    # Check that 'body' was stripped from path and path points to ['system', 'denominator']
    assert fields[0]["path"] == ["system", "denominator"]
    assert fields[0]["code"] == "VALIDATION_ERROR"


def test_limit_exceeded_error(client: TestClient):
    # num_points > 10000 violates limit
    payload = {
        "system": {
            "type": "tf",
            "numerator": [1.0],
            "denominator": [1.0, 1.0],
        },
        "num_points": 20000,
    }
    response = client.post("/api/v1/control/nyquist", json=payload)
    assert response.status_code == 422

    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "LIMIT_EXCEEDED"
    assert data["error"]["fields"][0]["code"] == "LIMIT_EXCEEDED"
    assert data["error"]["fields"][0]["path"] == ["num_points"]


def test_calculator_unavailable_error(client: TestClient):
    # Unknown calculator under /api/v1/control/nonexistent
    response = client.post("/api/v1/control/nonexistent", json={})
    assert response.status_code == 404

    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "CALCULATOR_UNAVAILABLE"


def test_generic_not_found_error(client: TestClient):
    # Unknown non-calculator route
    response = client.get("/api/v1/random_route")
    assert response.status_code == 404

    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"

