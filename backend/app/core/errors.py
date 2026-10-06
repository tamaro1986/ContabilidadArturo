import logging
from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

_GENERIC_DETAILS = {
    status.HTTP_401_UNAUTHORIZED: "Autenticación requerida.",
    status.HTTP_403_FORBIDDEN: "No tienes permisos para realizar esta acción.",
    status.HTTP_404_NOT_FOUND: "Recurso no encontrado.",
    status.HTTP_409_CONFLICT: "La operación entra en conflicto con el estado actual.",
    413: "La solicitud supera el tamaño permitido.",
    422: "La solicitud no pudo ser procesada.",
    status.HTTP_503_SERVICE_UNAVAILABLE: "El servicio no está disponible.",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "Ocurrió un error interno.",
}


class ApiException(HTTPException):
    """HTTP error with a stable machine-readable code."""

    def __init__(
        self,
        status_code: int,
        code: str,
        detail: str,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.code = code


async def api_exception_handler(
    _request: Request,
    exc: ApiException,
) -> JSONResponse:
    content: dict[str, Any] = {
        "detail": exc.detail,
        "code": exc.code,
    }
    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers=exc.headers,
    )


async def legacy_http_exception_handler(
    request: Request,
    exc: HTTPException,
) -> JSONResponse:
    """Sanitize legacy route errors until every route uses ApiException."""
    response_status = exc.status_code
    if response_status == status.HTTP_400_BAD_REQUEST:
        response_status = status.HTTP_422_UNPROCESSABLE_CONTENT
    if response_status not in _GENERIC_DETAILS:
        response_status = status.HTTP_500_INTERNAL_SERVER_ERROR

    log_method = logger.error if response_status >= 500 else logger.warning
    log_method(
        "Legacy HTTP error on %s (%s): %r",
        request.url.path,
        exc.status_code,
        exc.detail,
    )
    return JSONResponse(
        status_code=response_status,
        content={
            "detail": _GENERIC_DETAILS[response_status],
            "code": f"HTTP_{response_status}",
        },
        headers=exc.headers,
    )
