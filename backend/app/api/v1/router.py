from fastapi import APIRouter
from backend.app.api.v1.discovery import router as discovery_router
from backend.app.registry.calculator_registry import registry

# Import calculator modules to trigger automatic registration
import backend.app.calculators.control.nyquist  # noqa: F401

v1_router = APIRouter(prefix="/api/v1")

# Mount discovery endpoint
v1_router.include_router(discovery_router)

# Mount all registered calculators
for calc_router in registry.get_all_routers():
    v1_router.include_router(calc_router)

