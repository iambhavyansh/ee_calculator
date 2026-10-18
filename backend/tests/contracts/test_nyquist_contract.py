import json
from pathlib import Path
from fastapi.testclient import TestClient


def test_nyquist_contract_envelope_and_fixture(client: TestClient):
    payload = {
        "system": {
            "type": "tf",
            "numerator": [1.0],
            "denominator": [1.0, 2.0, 1.0],
        },
        "omega_start": 0.1,
        "omega_end": 10.0,
        "num_points": 50,
    }

    response = client.post("/api/v1/control/nyquist", json=payload)
    assert response.status_code == 200

    data = response.json()

    # Verify all six top-level envelope fields are present (Contract §3)
    required_keys = {"status", "calculator", "results", "plots", "tables", "warnings"}
    assert required_keys.issubset(data.keys())

    assert data["status"] == "success"
    assert data["calculator"] == "control.nyquist"
    assert isinstance(data["results"], dict)
    assert isinstance(data["plots"], list)
    assert isinstance(data["tables"], list)
    assert isinstance(data["warnings"], list)

    # Save to contracts/fixtures/nyquist_contract_fixture.json
    fixture_dir = Path(__file__).resolve().parent.parent.parent.parent / "contracts" / "fixtures"
    fixture_dir.mkdir(parents=True, exist_ok=True)
    fixture_file = fixture_dir / "nyquist_contract_fixture.json"

    fixture_content = {
        "calculator": "control.nyquist",
        "request": payload,
        "response": data,
    }

    with open(fixture_file, "w", encoding="utf-8") as f:
        json.dump(fixture_content, f, indent=2)

    assert fixture_file.exists()

