from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field


class ComplexNumber(BaseModel):
    """Complex number represented in rectangular form {re, im}."""
    re: float
    im: float


class WarningItem(BaseModel):
    """Warning item structure according to contract §3.5."""
    code: str
    message: str


class PlotWrapper(BaseModel, Generic[TypeVar("T")]):
    """Standard plot wrapper according to contract §3.3."""
    id: str
    type: str
    title: str
    data: Any


class TableColumn(BaseModel):
    key: str
    label: str
    unit: Optional[str] = None


class TableWrapper(BaseModel):
    """Standard table wrapper according to contract §3.4."""
    id: str
    title: str
    columns: List[TableColumn] = Field(default_factory=list)
    rows: List[Dict[str, Any]] = Field(default_factory=list)


TResult = TypeVar("TResult")


class ResponseEnvelope(BaseModel, Generic[TResult]):
    """
    Top-level success envelope according to contract §3.
    All six fields are always present.
    """
    status: str = "success"
    calculator: str
    results: TResult
    plots: List[PlotWrapper] = Field(default_factory=list)
    tables: List[TableWrapper] = Field(default_factory=list)
    warnings: List[WarningItem] = Field(default_factory=list)

