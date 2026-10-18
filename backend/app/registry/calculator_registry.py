from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field


class CalculatorModeMetadata(BaseModel):
    id: str
    label: str
    execution: str  # "sync" or "async"


class CalculatorMetadata(BaseModel):
    """Calculator discovery metadata according to contract §2.5."""
    id: str
    name: str
    category: str
    category_label: str
    description: str
    endpoint: str
    execution: str = "sync"  # "sync" or "async"
    mode_field: Optional[str] = None
    modes: List[CalculatorModeMetadata] = Field(default_factory=list)


@dataclass
class CalculatorEntry:
    metadata: CalculatorMetadata
    router: APIRouter
    logic_func: Callable[[Dict[str, Any]], Dict[str, Any]]


class CalculatorRegistry:
    def __init__(self) -> None:
        self._calculators: Dict[str, CalculatorEntry] = {}

    def register(self, entry: CalculatorEntry) -> None:
        """Registers a calculator and validates its metadata."""
        self._validate_metadata(entry.metadata)
        if entry.metadata.id in self._calculators:
            raise ValueError(f"Calculator {entry.metadata.id} is already registered.")
        self._calculators[entry.metadata.id] = entry

    def _validate_metadata(self, meta: CalculatorMetadata) -> None:
        """Validates required metadata fields."""
        if not meta.id or "." not in meta.id:
            raise ValueError(f"Invalid calculator id: '{meta.id}'. Must follow category.slug convention.")
        if not meta.name:
            raise ValueError(f"Calculator {meta.id} missing name.")
        if not meta.category:
            raise ValueError(f"Calculator {meta.id} missing category.")
        if not meta.category_label:
            raise ValueError(f"Calculator {meta.id} missing category_label.")
        if not meta.endpoint or not meta.endpoint.startswith("/"):
            raise ValueError(f"Calculator {meta.id} has invalid endpoint: '{meta.endpoint}'.")
        if meta.execution not in ("sync", "async"):
            raise ValueError(f"Calculator {meta.id} execution must be 'sync' or 'async'.")

    def get(self, calculator_id: str) -> Optional[CalculatorEntry]:
        return self._calculators.get(calculator_id)

    def get_all_metadata(self) -> List[CalculatorMetadata]:
        return [entry.metadata for entry in self._calculators.values()]

    def get_all_routers(self) -> List[APIRouter]:
        return [entry.router for entry in self._calculators.values()]


registry = CalculatorRegistry()

