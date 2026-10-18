import math
from typing import Any, Dict, List, Optional
import numpy as np
import control

from backend.app.core.control_engine import (
    count_open_loop_rhp_poles,
    create_control_system,
    extract_poles_and_zeros,
    has_imaginary_axis_poles,
)


def _sanitize_float(val: Any) -> Optional[float]:
    """Sanitizes floats, replacing nan/inf with None per contract §3.5."""
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def compute_nyquist(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Core mathematical logic for Nyquist plot calculation.
    Runs inside the worker process.
    """
    sys_input = payload.get("system")
    tf = create_control_system(sys_input)

    # 1. Poles, zeros, and open-loop RHP pole count
    poles, zeros = extract_poles_and_zeros(tf)
    p_rhp = count_open_loop_rhp_poles(tf)
    has_j_poles = has_imaginary_axis_poles(tf)

    # 2. Determine frequency evaluation grid if specified
    omega_start = payload.get("omega_start")
    omega_end = payload.get("omega_end")
    num_points = payload.get("num_points", 1000)

    omega_custom = None
    if omega_start is not None and omega_end is not None:
        # Use logspace if start > 0, otherwise linspace
        if omega_start > 0:
            omega_custom = np.geomspace(omega_start, omega_end, num_points)
        else:
            omega_custom = np.linspace(omega_start, omega_end, num_points)
    elif omega_start is not None:
        omega_custom = np.linspace(omega_start, max(omega_start * 100, 100.0), num_points)
    elif omega_end is not None:
        omega_custom = np.linspace(1e-3, omega_end, num_points)

    # 3. Compute Nyquist response using python-control
    if omega_custom is not None:
        nyq_data = control.nyquist_response(tf, omega=omega_custom)
    else:
        nyq_data = control.nyquist_response(tf)

    # Encirclements N of (-1, 0) in clockwise direction
    num_encirclements = int(nyq_data.count)

    # Closed-loop stability: Z = P + N
    num_closed_loop_rhp = p_rhp + num_encirclements
    is_stable = bool(num_closed_loop_rhp == 0)

    # 4. Extract positive branch from contour and response
    # Contour is s = j*omega (with indentations if imaginary-axis poles exist)
    contour_s = nyq_data.contour
    response_g = nyq_data.response

    pos_omega: List[Optional[float]] = [_sanitize_float(np.imag(s)) for s in contour_s]
    pos_real: List[Optional[float]] = [_sanitize_float(np.real(g)) for g in response_g]
    pos_imag: List[Optional[float]] = [_sanitize_float(np.imag(g)) for g in response_g]

    # Negative branch (mirror: omega -> -omega, real -> real, imag -> -imag)
    neg_omega: List[Optional[float]] = [(-w if w is not None else None) for w in pos_omega]
    neg_real: List[Optional[float]] = list(pos_real)
    neg_imag: List[Optional[float]] = [(-im if im is not None else None) for im in pos_imag]

    # 5. Stability margins (Gain Margin, Phase Margin)
    gain_margin_db: Optional[float] = None
    gain_margin_freq: Optional[float] = None
    phase_margin_deg: Optional[float] = None
    phase_margin_freq: Optional[float] = None

    warnings: List[Dict[str, str]] = []

    try:
        gm, pm, wcg, wcp = control.margin(tf)

        if gm is not None and not math.isinf(gm) and not math.isnan(gm) and gm > 0:
            gain_margin_db = float(20.0 * np.log10(gm))
            gain_margin_freq = _sanitize_float(wcg)
        else:
            warnings.append({
                "code": "INFINITE_GAIN_MARGIN",
                "message": "Phase does not cross -180 degrees; gain margin is infinite.",
            })

        if pm is not None and not math.isinf(pm) and not math.isnan(pm):
            phase_margin_deg = float(pm)
            phase_margin_freq = _sanitize_float(wcp)
        else:
            warnings.append({
                "code": "INFINITE_PHASE_MARGIN",
                "message": "Gain does not cross 0 dB (unity gain); phase margin is undefined.",
            })
    except Exception:
        pass

    if has_j_poles:
        warnings.append({
            "code": "IMAGINARY_AXIS_POLE",
            "message": "System has open-loop pole(s) on the stability boundary (imaginary axis or unit circle); Nyquist contour indents around the boundary.",
        })

    if p_rhp > 0:
        warnings.append({
            "code": "OPEN_LOOP_UNSTABLE",
            "message": f"System has {p_rhp} open-loop pole(s) in the right-half plane.",
        })

    plot_data = {
        "positive_branch": {
            "omega": pos_omega,
            "real": pos_real,
            "imag": pos_imag,
        },
        "negative_branch": {
            "omega": neg_omega,
            "real": neg_real,
            "imag": neg_imag,
        },
    }

    results = {
        "poles": poles,
        "zeros": zeros,
        "num_open_loop_rhp_poles": p_rhp,
        "num_encirclements": num_encirclements,
        "is_stable": is_stable,
        "gain_margin_db": _sanitize_float(gain_margin_db),
        "gain_margin_freq": gain_margin_freq,
        "phase_margin_deg": _sanitize_float(phase_margin_deg),
        "phase_margin_freq": phase_margin_freq,
    }

    return {
        "results": results,
        "plots": [
            {
                "id": "nyquist",
                "type": "nyquist",
                "title": "Nyquist Plot",
                "data": plot_data,
            }
        ],
        "tables": [],
        "warnings": warnings,
    }

