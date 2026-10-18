from typing import Any, Dict, List, Literal, Optional, Tuple, Union
import numpy as np
import control
from pydantic import BaseModel, Field, model_validator


class TransferFunctionInput(BaseModel):
    type: Literal["tf"] = "tf"
    numerator: List[float] = Field(..., min_length=1, description="Numerator polynomial coefficients (descending powers)")
    denominator: List[float] = Field(..., min_length=1, description="Denominator polynomial coefficients (descending powers)")
    dt: Optional[float] = Field(default=None, ge=0, description="Sampling time in seconds. None or 0 for continuous-time; > 0 for discrete-time.")

    @model_validator(mode="after")
    def validate_tf(self) -> "TransferFunctionInput":
        # Denominator cannot be all zeros
        if all(abs(c) < 1e-12 for c in self.denominator):
            raise ValueError("Denominator polynomial cannot be zero.")
        # Leading coefficient of denominator cannot be zero
        if abs(self.denominator[0]) < 1e-12:
            raise ValueError("Leading coefficient of denominator polynomial cannot be zero.")
        return self


class StateSpaceInput(BaseModel):
    type: Literal["ss"] = "ss"
    A: List[List[float]] = Field(..., description="System matrix A (n x n)")
    B: List[List[float]] = Field(..., description="Input matrix B (n x 1 for SISO)")
    C: List[List[float]] = Field(..., description="Output matrix C (1 x n for SISO)")
    D: List[List[float]] = Field(..., description="Feedthrough matrix D (1 x 1 for SISO)")
    dt: Optional[float] = Field(default=None, ge=0, description="Sampling time in seconds. None or 0 for continuous-time; > 0 for discrete-time.")

    @model_validator(mode="after")
    def validate_ss(self) -> "StateSpaceInput":
        n = len(self.A)
        if n == 0:
            raise ValueError("Matrix A cannot be empty.")
        for row in self.A:
            if len(row) != n:
                raise ValueError("Matrix A must be square (n x n).")

        if len(self.B) != n:
            raise ValueError(f"Matrix B must have {n} rows matching A.")
        for row in self.B:
            if len(row) != 1:
                raise ValueError("Matrix B must have 1 column for SISO systems.")

        if len(self.C) != 1:
            raise ValueError("Matrix C must have 1 row for SISO systems.")
        if len(self.C[0]) != n:
            raise ValueError(f"Matrix C must have {n} columns matching A.")

        if len(self.D) != 1 or len(self.D[0]) != 1:
            raise ValueError("Matrix D must be 1 x 1 for SISO systems.")

        return self


SystemInput = Union[TransferFunctionInput, StateSpaceInput]


def create_control_system(sys_input: Union[SystemInput, Dict[str, Any]]) -> control.TransferFunction:
    """
    Parses a SystemInput (or raw dict) and returns a python-control SISO TransferFunction.
    Converts state-space to transfer function if needed.
    """
    if isinstance(sys_input, dict):
        sys_type = sys_input.get("type", "tf")
        if sys_type == "tf":
            sys_input = TransferFunctionInput(**sys_input)
        elif sys_type == "ss":
            sys_input = StateSpaceInput(**sys_input)
        else:
            raise ValueError(f"Unsupported system type: '{sys_type}'. Must be 'tf' or 'ss'.")

    dt = sys_input.dt if (sys_input.dt is not None and sys_input.dt > 0) else None

    if sys_input.type == "tf":
        # Normalize continuous vs discrete dt for python-control
        tf = control.TransferFunction(sys_input.numerator, sys_input.denominator, dt=dt)
        return tf
    elif sys_input.type == "ss":
        A = np.array(sys_input.A, dtype=float)
        B = np.array(sys_input.B, dtype=float)
        C = np.array(sys_input.C, dtype=float)
        D = np.array(sys_input.D, dtype=float)
        ss = control.StateSpace(A, B, C, D, dt=dt)
        tf = control.tf(ss)
        return tf


def extract_poles_and_zeros(tf: control.TransferFunction) -> Tuple[List[Dict[str, float]], List[Dict[str, float]]]:
    """
    Extracts poles and zeros from a transfer function as lists of {re, im}.
    """
    raw_poles = tf.poles()
    raw_zeros = tf.zeros()

    poles = [{"re": float(np.real(p)), "im": float(np.imag(p))} for p in raw_poles]
    zeros = [{"re": float(np.real(z)), "im": float(np.imag(z))} for z in raw_zeros]
    return poles, zeros


def count_open_loop_rhp_poles(tf: control.TransferFunction) -> int:
    """
    Counts unstable open-loop poles:
    - Continuous-time: Re(p) > 1e-7
    - Discrete-time: |p| > 1.0 + 1e-7
    """
    raw_poles = tf.poles()
    is_discrete = tf.dt is not None and tf.dt > 0

    if is_discrete:
        return int(np.sum(np.abs(raw_poles) > 1.0 + 1e-7))
    else:
        return int(np.sum(np.real(raw_poles) > 1e-7))


def has_imaginary_axis_poles(tf: control.TransferFunction) -> bool:
    """
    Checks if system has poles on the imaginary axis (continuous) or unit circle (discrete).
    """
    raw_poles = tf.poles()
    is_discrete = tf.dt is not None and tf.dt > 0

    if is_discrete:
        return bool(np.any(np.abs(np.abs(raw_poles) - 1.0) < 1e-6))
    else:
        return bool(np.any(np.abs(np.real(raw_poles)) < 1e-6))

