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
    token = credentials.credentials

    # 1. Validación nativa de JWT en el VPS usando JWT_SECRET
    jwt_secret = settings.JWT_SECRET or settings.SUPABASE_KEY or settings.SUPABASE_ANON_KEY
    if jwt_secret:
        try:
            import jwt
            from types import SimpleNamespace
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            user_id = payload.get("sub")
            if user_id:
                user = SimpleNamespace(
                    id=str(user_id),
                    email=payload.get("email"),
                    user_metadata=payload,
                )
                if supabase:
                    try:
                        supabase.postgrest.auth(token)
                    except Exception:
                        pass
                return {"user": user, "supabase": supabase, "token": token}
        except Exception:
            pass

    # 2. Fallback a Supabase Auth si está configurado
    if supabase is not None:
        try:
            response = supabase.auth.get_user(token)
            if response.user:
                supabase.postgrest.auth(token)
                return {"user": response.user, "supabase": supabase, "token": token}
        except Exception:
            logger.warning("Supabase rechazó el token de autenticación", exc_info=True)

    if not jwt_secret and supabase is None:
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="AUTH_PROVIDER_UNAVAILABLE",
            detail="El servicio de autenticación no está disponible.",
        )

    raise ApiException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        code="AUTH_INVALID",
        detail="Credenciales de autenticación inválidas o expiradas.",
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
