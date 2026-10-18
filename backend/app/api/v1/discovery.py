from typing import List
from fastapi import APIRouter
from pydantic import BaseModel
from backend.app.registry.calculator_registry import CalculatorMetadata, registry

router = APIRouter(tags=["discovery"])


class DiscoveryResponse(BaseModel):
    calculators: List[CalculatorMetadata]


@router.get("/calculators", response_model=DiscoveryResponse)
async def get_calculators() -> DiscoveryResponse:
    """
    Returns the catalog of available calculators.
    Source of truth for frontend discovery (contract §2.5).
    """
    all_metadata = registry.get_all_metadata()
    return DiscoveryResponse(calculators=all_metadata)

