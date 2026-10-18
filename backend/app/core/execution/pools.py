import asyncio
from concurrent.futures import TimeoutError as FuturesTimeoutError
import logging
import multiprocessing
from typing import Any, Dict, Optional
from pebble import ProcessPool, ProcessExpired

from backend.app.config import settings
from backend.app.core.errors import CalculationTimeoutException, CalculatorException
from backend.app.core.execution.worker import execute_calculator, worker_initializer

logger = logging.getLogger(__name__)


class ExecutionPoolManager:
    """
    Manages the terminable worker process pool for synchronous calculations.
    Uses pebble.ProcessPool with multiprocessing.get_context('spawn').
    """
    def __init__(self) -> None:
        self._pool: Optional[ProcessPool] = None

    def start(self) -> None:
        """Starts the process pool with pre-warmed workers."""
        if self._pool is not None:
            return

        context = multiprocessing.get_context("spawn")
        logger.info(
            "Starting sync worker pool with %d workers (spawn context)",
            settings.SYNC_WORKER_POOL_SIZE,
        )
        self._pool = ProcessPool(
            max_workers=settings.SYNC_WORKER_POOL_SIZE,
            context=context,
            initializer=worker_initializer,
        )

    def shutdown(self) -> None:
        """Stops the process pool."""
        if self._pool is not None:
            logger.info("Shutting down sync worker pool")
            self._pool.close()
            self._pool.join()
            self._pool = None

    async def execute_sync(
        self,
        calculator_id: str,
        payload: Dict[str, Any],
        timeout: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches a calculation to the sync worker pool.
        Enforces a timeout, terminating the worker process if exceeded.
        """
        if self._pool is None:
            self.start()

        timeout_sec = timeout if timeout is not None else float(settings.SYNC_TIMEOUT_SECONDS)

        # Schedule the task on the pebble ProcessPool
        future = self._pool.schedule(
            execute_calculator,
            args=[calculator_id, payload],
            timeout=timeout_sec,
        )

        try:
            # Await the result in a thread to keep the event loop responsive
            result = await asyncio.to_thread(future.result)
            return result
        except FuturesTimeoutError:
            logger.warning(
                "Calculation for %s timed out after %.1fs (worker terminated)",
                calculator_id,
                timeout_sec,
            )
            raise CalculationTimeoutException(
                message=f"Calculation exceeded timeout limit of {int(timeout_sec)} seconds."
            )
        except ProcessExpired as e:
            logger.error("Worker process expired unexpectedly during %s: %s", calculator_id, e)
            raise CalculatorException(
                code="INTERNAL_ERROR",
                message="Worker process died unexpectedly during calculation.",
                status_code=500,
            )
        except CalculatorException:
            raise
        except Exception as e:
            logger.exception("Error during execution of %s: %s", calculator_id, e)
            raise


execution_pool_manager = ExecutionPoolManager()

