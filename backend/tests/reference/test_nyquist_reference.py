import pytest
from backend.app.calculators.control.nyquist.logic import compute_nyquist


def test_reference_first_order_lag():
    """
    G(s) = 1 / (s + 1)
    Known properties:
    - Real axis intercept at omega=0: 1.0
    - Encirclements of -1: 0
    - Closed-loop stable: True
    """
    payload = {
        "system": {
            "type": "tf",
            "numerator": [1.0],
            "denominator": [1.0, 1.0],
        },
    }
    result = compute_nyquist(payload)
    results = result["results"]

    assert results["is_stable"] is True
    assert results["num_open_loop_rhp_poles"] == 0
    assert results["num_encirclements"] == 0

    plot_data = result["plots"][0]["data"]
    pos_re = plot_data["positive_branch"]["real"]
    # Starting point at low frequency should be close to 1.0
    assert pytest.approx(pos_re[0], rel=1e-2) == 1.0


def test_reference_third_order_stability_threshold():
    """
    G(s) = K / (s+1)(s+2)(s+3) = K / (s^3 + 6s^2 + 11s + 6)
    Critical gain by Routh-Hurwitz is Kcrit = 60.
    For K = 10: GM = 6.0 (approx 15.56 dB), N = 0 (stable).
    For K = 100: K > Kcrit, N = 2 (unstable).
    """
    # Case 1: K = 10 (Stable)
    payload_stable = {
        "system": {
            "type": "tf",
            "numerator": [10.0],
            "denominator": [1.0, 6.0, 11.0, 6.0],
        },
    }
    res_stable = compute_nyquist(payload_stable)["results"]
    assert res_stable["is_stable"] is True
    assert res_stable["num_encirclements"] == 0
    assert res_stable["gain_margin_db"] is not None
    assert pytest.approx(res_stable["gain_margin_db"], abs=0.2) == 15.56

    # Case 2: K = 100 (Unstable)
    payload_unstable = {
        "system": {
            "type": "tf",
            "numerator": [100.0],
            "denominator": [1.0, 6.0, 11.0, 6.0],
        },
    }
    res_unstable = compute_nyquist(payload_unstable)["results"]
    assert res_unstable["is_stable"] is False
    assert res_unstable["num_encirclements"] == 2


def test_reference_discrete_system():
    """
    G(z) = 0.2 / (z - 0.8), dt = 0.1
    Pole at z = 0.8 (stable open-loop, |p| < 1).
    DC gain at z = 1: 0.2 / (1 - 0.8) = 1.0.
    Closed-loop is stable with no encirclements.
    """
    payload = {
        "system": {
            "type": "tf",
            "numerator": [0.2],
            "denominator": [1.0, -0.8],
            "dt": 0.1,
        },
    }
    result = compute_nyquist(payload)
    results = result["results"]

    assert results["is_stable"] is True
    assert results["num_open_loop_rhp_poles"] == 0
    assert results["num_encirclements"] == 0
    pos_re = result["plots"][0]["data"]["positive_branch"]["real"]
    assert pytest.approx(pos_re[0], rel=1e-2) == 1.0

