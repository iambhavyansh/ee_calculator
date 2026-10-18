import logging
from typing import Any, Dict, List, Optional, Union
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

# Error Codes as defined in API Contract §4.3
CODE_VALIDATION_ERROR = "VALIDATION_ERROR"
CODE_LIMIT_EXCEEDED = "LIMIT_EXCEEDED"
CODE_QUEUE_FULL = "QUEUE_FULL"
CODE_INTERNAL_ERROR = "INTERNAL_ERROR"
CODE_CALCULATION_TIMEOUT = "CALCULATION_TIMEOUT"
CODE_JOB_UNAVAILABLE = "JOB_UNAVAILABLE"
CODE_CALCULATOR_UNAVAILABLE = "CALCULATOR_UNAVAILABLE"
CODE_NOT_FOUND = "NOT_FOUND"
CODE_REQUEST_ERROR = "REQUEST_ERROR"


class FieldError(BaseModel):
    path: List[Union[str, int]]
    code: str
    message: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    fields: Optional[List[FieldError]] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


class CalculatorException(Exception):
    """Base exception for domain calculations."""
    def __init__(self, code: str, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class LimitExceededException(CalculatorException):
    def __init__(self, message: str, field_path: Optional[List[Union[str, int]]] = None):
        super().__init__(
            code=CODE_LIMIT_EXCEEDED,
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
        self.field_path = field_path


class CalculationTimeoutException(CalculatorException):
    def __init__(self, message: str = "Calculation timed out."):
        super().__init__(
            code=CODE_CALCULATION_TIMEOUT,
            message=message,
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        )


def clean_path(loc: tuple) -> List[Union[str, int]]:
    """
    Cleans Pydantic error 'loc' tuple according to contract §4.4:
    - Strips leading 'body'
    - Keeps integer indices as integers
    - Strips internal union/discriminator markers and function markers
    """
    path: List[Union[str, int]] = []
    # Skip leading 'body'
    start_idx = 1 if len(loc) > 0 and loc[0] == "body" else 0
    for item in loc[start_idx:]:
        # Ignore union markers or internal validator names if any
        if isinstance(item, str):
            if (
                item.startswith("function-")
                or item.startswith("constrained-")
                or item in ("union", "discriminator")
            ):
                continue
        path.append(item)
    return path


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Custom 422 handler satisfying Contract §4 and §4.4.
    """
    field_errors: List[FieldError] = []
    has_limit_exceeded = False
    all_limit_exceeded = True

    for error in exc.errors():
        msg = error.get("msg", "Invalid value.")
        err_type = error.get("type", "")
        loc = error.get("loc", ())
        path = clean_path(loc)

        # Check if error represents a limit violation
        if "limit" in err_type or "greater_than" in err_type or "less_than" in err_type or "max_length" in err_type:
            code = CODE_LIMIT_EXCEEDED
            has_limit_exceeded = True
        else:
            code = CODE_VALIDATION_ERROR
            all_limit_exceeded = False

        field_errors.append(
            FieldError(
                path=path,
                code=code,
                message=msg,
            )
        )

    if not field_errors:
        all_limit_exceeded = False

    top_code = CODE_LIMIT_EXCEEDED if (field_errors and all_limit_exceeded) else CODE_VALIDATION_ERROR
    top_message = "Configured input limit exceeded." if top_code == CODE_LIMIT_EXCEEDED else "One or more input fields are invalid."

    response_data = ErrorResponse(
        error=ErrorDetail(
            code=top_code,
            message=top_message,
            fields=field_errors,
        )
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=response_data.model_dump(exclude_none=True),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Custom HTTPException handler satisfying Contract §4.1 and §4.3.
    """
    status_code = exc.status_code
    path = request.url.path

    if status_code == status.HTTP_404_NOT_FOUND:
        # Check if the path targets a calculator route under /api/v1/
        parts = [p for p in path.strip("/").split("/") if p]
        # Example: api/v1/control/unknown_calc -> 4 parts
        if len(parts) >= 4 and parts[0] == "api" and parts[1] == "v1":
            code = CODE_CALCULATOR_UNAVAILABLE
            message = "Calculator endpoint is unknown or not available."
        else:
            code = CODE_NOT_FOUND
            message = "The requested resource was not found."
    elif status_code == status.HTTP_410_GONE:
        code = CODE_JOB_UNAVAILABLE
        message = "This calculation result is no longer available."
    elif status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        code = CODE_QUEUE_FULL
        message = "The server is busy. Try again in a moment."
    elif status_code == status.HTTP_504_GATEWAY_TIMEOUT:
        code = CODE_CALCULATION_TIMEOUT
        message = "Calculation timed out."
    elif 400 <= status_code < 500:
        code = CODE_REQUEST_ERROR
        message = exc.detail if isinstance(exc.detail, str) else "Invalid request."
    else:
        code = CODE_INTERNAL_ERROR
        message = "An unexpected server error occurred."

    response_data = ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=message,
        )
    )
    headers = getattr(exc, "headers", None)
    return JSONResponse(
        status_code=status_code,
        content=response_data.model_dump(exclude_none=True),
        headers=headers,
    )


async def calculator_exception_handler(request: Request, exc: CalculatorException) -> JSONResponse:
    """
    Handler for domain-level calculator exceptions.
    """
    fields = None
    if isinstance(exc, LimitExceededException) and exc.field_path:
        fields = [
            FieldError(
                path=exc.field_path,
                code=CODE_LIMIT_EXCEEDED,
                message=exc.message,
            )
        ]

    response_data = ErrorResponse(
        error=ErrorDetail(
            code=exc.code,
            message=exc.message,
            fields=fields,
        )
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=response_data.model_dump(exclude_none=True),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler for unexpected 500 errors. Stack traces logged, never leaked to client.
    """
    logger.exception("Unhandled server exception on %s: %s", request.url.path, exc)
    response_data = ErrorResponse(
        error=ErrorDetail(
            code=CODE_INTERNAL_ERROR,
            message="An unexpected server error occurred.",
        )
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response_data.model_dump(exclude_none=True),
    )


def register_error_handlers(app: FastAPI) -> None:
    """Registers all contract-compliant error handlers with the FastAPI application."""
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(CalculatorException, calculator_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

