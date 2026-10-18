from fastapi.testclient import TestClient


def test_nyquist_api_tf(client: TestClient):
    payload = {
        "system": {
            "type": "tf",
            "numerator": [1.0],
            "denominator": [1.0, 2.0, 1.0],
        },
        "num_points": 100,
    }
    response = client.post("/api/v1/control/nyquist", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "success"
    assert data["calculator"] == "control.nyquist"
    assert "results" in data
    assert "plots" in data
    assert "tables" in data
    assert "warnings" in data
    assert isinstance(data["tables"], list)
    assert isinstance(data["warnings"], list)
    assert len(data["plots"]) == 1

    plot = data["plots"][0]
    assert plot["id"] == "nyquist"
    assert plot["type"] == "nyquist"
    assert "positive_branch" in plot["data"]
    assert "negative_branch" in plot["data"]


def test_nyquist_api_ss(client: TestClient):
    # State space representation of 1 / (s + 2)
    payload = {
        "system": {
            "type": "ss",
            "A": [[-2.0]],
            "B": [[1.0]],
            "C": [[1.0]],
            "D": [[0.0]],
        },
    }
    response = client.post("/api/v1/control/nyquist", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "success"
    assert data["calculator"] == "control.nyquist"
    assert data["results"]["is_stable"] is True


def test_nyquist_api_frequency_override(client: TestClient):
    payload = {
        "system": {
            "type": "tf",
            "numerator": [1.0],
            "denominator": [1.0, 1.0],
        },
        "omega_start": 0.1,
        "omega_end": 100.0,
        "num_points": 200,
    }
    response = client.post("/api/v1/control/nyquist", json=payload)
    assert response.status_code == 200

    data = response.json()
    pos_branch = data["plots"][0]["data"]["positive_branch"]
    assert len(pos_branch["omega"]) == 200

