from fastapi.testclient import TestClient


def test_discovery_endpoint(client: TestClient):
    response = client.get("/api/v1/calculators")
    assert response.status_code == 200

    data = response.json()
    assert "calculators" in data
    assert isinstance(data["calculators"], list)

    calc_ids = [c["id"] for c in data["calculators"]]
    assert "control.nyquist" in calc_ids

    nyquist_meta = next(c for c in data["calculators"] if c["id"] == "control.nyquist")
    assert nyquist_meta["name"] == "Nyquist Plot"
    assert nyquist_meta["category"] == "control"
    assert nyquist_meta["category_label"] == "Control Systems"
    assert nyquist_meta["endpoint"] == "/control/nyquist"
    assert nyquist_meta["execution"] == "sync"
    assert nyquist_meta["mode_field"] is None
    assert nyquist_meta["modes"] == []

