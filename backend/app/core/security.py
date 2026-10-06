import logging
from typing import Any, TypedDict

from fastapi import Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client

from app.core.config import settings
from app.core.errors import ApiException
from app.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


class AuthenticatedSession(TypedDict):
    user: Any | None
    supabase: Client | None
    token: str


def get_authenticated_session(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    supabase: Client | None = Depends(get_supabase_client),
) -> AuthenticatedSession:
    if settings.MOCK_MODE and request.headers.get("X-Mock-Tenant-ID"):
        return {"user": None, "supabase": supabase, "token": ""}

    if credentials is None:
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_REQUIRED",
            detail="Autenticación requerida.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if supabase is None:
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="AUTH_PROVIDER_UNAVAILABLE",
            detail="El servicio de autenticación no está disponible.",
        )

    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
        if not response.user:
            raise ApiException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                code="AUTH_INVALID",
                detail="Credenciales de autenticación inválidas.",
            )
        supabase.postgrest.auth(token)
        return {"user": response.user, "supabase": supabase, "token": token}
    except ApiException:
        raise
    except Exception:
        logger.warning("Supabase rechazó el token de autenticación", exc_info=True)
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_INVALID",
            detail="Credenciales de autenticación inválidas.",
        )


def get_current_user(
    session: AuthenticatedSession = Depends(get_authenticated_session),
):
    if session["user"] is None:
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_REQUIRED",
            detail="Autenticación requerida.",
        )
    return session["user"]
