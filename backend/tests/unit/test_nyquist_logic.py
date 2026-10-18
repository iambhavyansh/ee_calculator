import pytest
from backend.app.calculators.control.nyquist.logic import compute_nyquist


def test_nyquist_logic_basic():
    payload = {
        "system": {
            "type": "tf",
            "numerator": [1.0],
            "denominator": [1.0, 1.0],
        },
        "num_points": 50,
    }
    result = compute_nyquist(payload)

    assert "results" in result
    assert "plots" in result
    assert "warnings" in result

    results = result["results"]
    assert results["is_stable"] is True
    assert results["num_open_loop_rhp_poles"] == 0
    assert results["num_encirclements"] == 0

    plot_data = result["plots"][0]["data"]
    pos_branch = plot_data["positive_branch"]
    neg_branch = plot_data["negative_branch"]

    assert len(pos_branch["omega"]) > 0
    assert len(pos_branch["real"]) == len(pos_branch["omega"])
    assert len(pos_branch["imag"]) == len(pos_branch["omega"])
    assert len(neg_branch["omega"]) == len(pos_branch["omega"])

    # Ensure negative branch is indeed the complex conjugate mirror
    assert pos_branch["real"][0] == neg_branch["real"][0]
    if pos_branch["imag"][0] is not None:
        assert pos_branch["imag"][0] == -neg_branch["imag"][0]


def test_nyquist_logic_no_nan_or_inf():
    # System with pole at origin: 1/s
    payload = {
        "system": {
            "type": "tf",
            "numerator": [1.0],
            "denominator": [1.0, 0.0],
        },
    }
    result = compute_nyquist(payload)
    plot_data = result["plots"][0]["data"]

    for val in plot_data["positive_branch"]["real"]:
        assert val is not None and not (isinstance(val, float) and (val != val or abs(val) == float("inf")))

    # Verify warning generated
    warning_codes = [w["code"] for w in result["warnings"]]
    assert "IMAGINARY_AXIS_POLE" in warning_codes

