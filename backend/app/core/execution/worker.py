import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


def worker_initializer() -> None:
    """
    Runs when a worker process starts to pre-import heavy libraries.
    Ensures spawn overhead is paid on pool startup, not per request.
    """
    try:
        import numpy
        import scipy
        import control
        # Pre-import calculator modules in worker process so registry is populated
        import backend.app.calculators.control.nyquist
    except Exception as e:
        logger.warning("Worker pre-warm warning: %s", e)


def execute_calculator(calculator_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Top-level, picklable worker entry point.
    Resolves the calculation logic from registry and runs it.
    Returns plain, serializable dictionary.
    """
    # Import here to avoid circular dependencies during initialization
    from backend.app.registry.calculator_registry import registry

    if not registry.get(calculator_id):
        # Fallback dynamic import if not yet registered in this process
        import backend.app.calculators.control.nyquist

    calculator_entry = registry.get(calculator_id)
    if not calculator_entry:
        raise ValueError(f"Calculator {calculator_id} not found in registry.")

    # Call the calculator logic function
    result = calculator_entry.logic_func(payload)
    return result

