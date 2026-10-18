from typing import List, Optional
from pydantic import BaseModel, Field, model_validator

from backend.app.core.control_engine import SystemInput
from backend.app.core.schemas import ComplexNumber, PlotWrapper, ResponseEnvelope


class NyquistRequest(BaseModel):
    """Request payload for Nyquist plot calculation."""
    system: SystemInput
    omega_start: Optional[float] = Field(
        default=None,
        ge=0,
        description="Starting frequency in rad/s (optional).",
    )
    omega_end: Optional[float] = Field(
        default=None,
        gt=0,
        description="Ending frequency in rad/s (optional).",
    )
    num_points: int = Field(
        default=1000,
        ge=10,
        le=10000,
        description="Number of frequency evaluation points (10 to 10000).",
    )

    @model_validator(mode="after")
    def validate_frequency_range(self) -> "NyquistRequest":
        if self.omega_start is not None and self.omega_end is not None:
            if self.omega_end <= self.omega_start:
                raise ValueError("omega_end must be strictly greater than omega_start.")
        return self


class NyquistBranch(BaseModel):
    """Coordinates of a frequency branch on the s/z plane contour."""
    omega: List[Optional[float]]
    real: List[Optional[float]]
    imag: List[Optional[float]]


class NyquistPlotData(BaseModel):
    """Plot data for positive and negative frequency branches."""
    positive_branch: NyquistBranch
    negative_branch: NyquistBranch


class NyquistResults(BaseModel):
    """Analytical stability and margin metrics for Nyquist."""
    poles: List[ComplexNumber]
    zeros: List[ComplexNumber]
    num_open_loop_rhp_poles: int
    num_encirclements: int
    is_stable: bool
    gain_margin_db: Optional[float] = None
    gain_margin_freq: Optional[float] = None
    phase_margin_deg: Optional[float] = None
    phase_margin_freq: Optional[float] = None


class NyquistPlotWrapper(PlotWrapper[NyquistPlotData]):
    id: str = "nyquist"
    type: str = "nyquist"
    title: str = "Nyquist Plot"
    data: NyquistPlotData


# Full response type
NyquistResponse = ResponseEnvelope[NyquistResults]

