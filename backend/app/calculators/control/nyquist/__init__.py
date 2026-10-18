from backend.app.calculators.control.nyquist.logic import compute_nyquist
from backend.app.calculators.control.nyquist.metadata import nyquist_metadata
from backend.app.calculators.control.nyquist.router import router
from backend.app.registry.calculator_registry import CalculatorEntry, registry

# Automatically register Nyquist calculator upon module import
registry.register(
    CalculatorEntry(
        metadata=nyquist_metadata,
        router=router,
        logic_func=compute_nyquist,
    )
)

__all__ = ["router", "nyquist_metadata", "compute_nyquist"]

