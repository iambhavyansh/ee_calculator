from fastapi import APIRouter
from backend.app.calculators.control.nyquist.schemas import NyquistRequest, NyquistResponse
from backend.app.core.execution.pools import execution_pool_manager

router = APIRouter()


@router.post("/control/nyquist", response_model=NyquistResponse)
async def calculate_nyquist(request: NyquistRequest) -> NyquistResponse:
    """
    Computes Nyquist frequency response and stability margins for a SISO system.
    Runs out-of-process in the terminable worker pool with timeout enforcement.
    """
    payload = request.model_dump()
    raw_output = await execution_pool_manager.execute_sync(
        calculator_id="control.nyquist",
        payload=payload,
    )

    return NyquistResponse(
        status="success",
        calculator="control.nyquist",
        results=raw_output["results"],
        plots=raw_output["plots"],
        tables=raw_output.get("tables", []),
        warnings=raw_output.get("warnings", []),
    )

