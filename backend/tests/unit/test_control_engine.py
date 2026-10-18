import pytest
from pydantic import ValidationError
from backend.app.core.control_engine import (
    TransferFunctionInput,
    StateSpaceInput,
    create_control_system,
    extract_poles_and_zeros,
    count_open_loop_rhp_poles,
    has_imaginary_axis_poles,
)


def test_tf_continuous_valid():
    tf_in = TransferFunctionInput(
        type="tf",
        numerator=[1.0],
        denominator=[1.0, 2.0, 1.0],
    )
    sys = create_control_system(tf_in)
    assert sys.dt is None
    poles, zeros = extract_poles_and_zeros(sys)
    assert len(poles) == 2
    assert pytest.approx(poles[0]["re"]) == -1.0
    assert pytest.approx(poles[1]["re"]) == -1.0
    assert len(zeros) == 0
    assert count_open_loop_rhp_poles(sys) == 0
    assert not has_imaginary_axis_poles(sys)


def test_tf_discrete_valid():
    tf_in = TransferFunctionInput(
        type="tf",
        numerator=[0.2],
        denominator=[1.0, -0.8],
        dt=0.1,
    )
    sys = create_control_system(tf_in)
    assert sys.dt == 0.1
    poles, zeros = extract_poles_and_zeros(sys)
    assert len(poles) == 1
    assert pytest.approx(poles[0]["re"]) == 0.8
    assert count_open_loop_rhp_poles(sys) == 0


def test_tf_zero_denominator_rejected():
    with pytest.raises(ValidationError):
        TransferFunctionInput(
            type="tf",
            numerator=[1.0],
            denominator=[0.0, 0.0],
        )


def test_tf_leading_zero_rejected():
    with pytest.raises(ValidationError):
        TransferFunctionInput(
            type="tf",
            numerator=[1.0],
            denominator=[0.0, 1.0],
        )


def test_ss_valid_conversion():
    # Double integrator: A = [[0, 1], [0, 0]], B = [[0], [1]], C = [[1, 0]], D = [[0]]
    ss_in = StateSpaceInput(
        type="ss",
        A=[[0.0, 1.0], [0.0, 0.0]],
        B=[[0.0], [1.0]],
        C=[[1.0, 0.0]],
        D=[[0.0]],
    )
    sys = create_control_system(ss_in)
    poles, zeros = extract_poles_and_zeros(sys)
    assert len(poles) == 2
    assert has_imaginary_axis_poles(sys)


def test_ss_dimension_mismatch_rejected():
    # A is 2x2, but B has 3 rows
    with pytest.raises(ValidationError):
        StateSpaceInput(
            type="ss",
            A=[[0.0, 1.0], [0.0, 0.0]],
            B=[[0.0], [1.0], [2.0]],
            C=[[1.0, 0.0]],
            D=[[0.0]],
        )

