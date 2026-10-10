import logging
from enum import Enum
from typing import Any, TypedDict

from fastapi import Depends, Request, status

from app.core.config import settings
from app.core.errors import ApiException
from app.core.security import AuthenticatedSession, get_authenticated_session

logger = logging.getLogger(__name__)


class UserRole(str, Enum):
    ADMIN = "administrador"
    CONTADOR = "contador"
    CLIENTE = "cliente"
    VIEWER = "viewer"
    OWNER = "owner"


class UserContext(TypedDict):
    user: Any | None
    tenant_id: str
    role: str


def get_tenant_from_request(request: Request) -> str | None:
    if settings.MOCK_MODE:
        return request.headers.get("X-Mock-Tenant-ID")
    return None


class RoleChecker:
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(
        self,
        request: Request,
        session: AuthenticatedSession = Depends(get_authenticated_session),
    ) -> UserContext:
        mock_tenant_id = get_tenant_from_request(request)
        if mock_tenant_id:
            return {
                "user": None,
                "tenant_id": mock_tenant_id,
                "role": UserRole.ADMIN.value,
            }

        current_user = session["user"]
        supabase = session.get("supabase")
        if current_user is None:
            raise ApiException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                code="AUTH_REQUIRED",
                detail="Autenticación requerida.",
            )

        profile_data = None
        db_url = settings.DATABASE_URL or settings.DIRECT_URL

        # 1. Consultar PostgreSQL directo si DATABASE_URL está configurado (VPS nativo)
        if db_url:
            try:
                import psycopg2
                conn = psycopg2.connect(db_url)
                cur = conn.cursor()
                cur.execute(
                    "SELECT role, tenant_id, is_active FROM public.user_profiles WHERE id = %s",
                    (str(current_user.id),)
                )
                row = cur.fetchone()
                cur.close()
                conn.close()
                if row:
                    profile_data = {
                        "role": row[0],
                        "tenant_id": str(row[1]) if row[1] else None,
                        "is_active": row[2] if row[2] is not None else True,
                    }
                else:
                    raise ApiException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        code="PROFILE_NOT_FOUND",
                        detail="Perfil de usuario no encontrado.",
                    )
            except ApiException:
                raise
            except Exception as e:
                logger.warning(f"Error consultando perfil en PostgreSQL directo: {e}")

        # 2. Si no se pudo por PostgreSQL, consultar Supabase si está disponible (tests o cloud)
        if profile_data is None and supabase is not None:
            try:
                profile_response = (
                    supabase.table("user_profiles")
                    .select("role, tenant_id, is_active")
                    .eq("id", current_user.id)
                    .single()
                    .execute()
                )
                if profile_response.data:
                    profile_data = profile_response.data
                else:
                    raise ApiException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        code="PROFILE_NOT_FOUND",
                        detail="Perfil de usuario no encontrado.",
                    )
            except ApiException:
                raise
            except Exception:
                logger.warning("Fallo en lookup de perfil con Supabase")

        # 3. Fallback a metadata del JWT si viene firmado nativamente
        if profile_data is None and hasattr(current_user, "user_metadata") and isinstance(current_user.user_metadata, dict):
            meta = current_user.user_metadata
            if meta.get("role") and meta.get("tenant_id"):
                profile_data = {
                    "role": meta.get("role"),
                    "tenant_id": str(meta.get("tenant_id")),
                    "is_active": meta.get("is_active", True),
                }

        if profile_data is None:
            raise ApiException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                code="PROFILE_LOOKUP_FAILED",
                detail="No se pudo validar el perfil del usuario.",
            )

        is_active = profile_data.get("is_active", True)
        if is_active is False:
            raise ApiException(
                status_code=status.HTTP_403_FORBIDDEN,
                code="USER_INACTIVE",
                detail="Tu cuenta de usuario se encuentra inactiva. Contacta al administrador.",
            )

        user_role = profile_data.get("role")
        tenant_id = profile_data.get("tenant_id")
        allowed_values = {role.value for role in self.allowed_roles}

        if user_role not in allowed_values:
            raise ApiException(
                status_code=status.HTTP_403_FORBIDDEN,
                code="ROLE_FORBIDDEN",
                detail="No tienes permisos suficientes para realizar esta acción.",
            )
        if not tenant_id:
            raise ApiException(
                status_code=status.HTTP_403_FORBIDDEN,
                code="TENANT_REQUIRED",
                detail="El usuario no tiene un tenant asignado.",
            )

        return {
            "user": current_user,
            "tenant_id": str(tenant_id),
            "role": str(user_role),
        }


require_admin = RoleChecker([UserRole.ADMIN])
require_contador = RoleChecker(
    [UserRole.CONTADOR, UserRole.ADMIN, UserRole.OWNER]
)
require_owner = RoleChecker([UserRole.OWNER, UserRole.ADMIN])
require_viewer = RoleChecker(
    [UserRole.VIEWER, UserRole.CLIENTE, UserRole.CONTADOR, UserRole.OWNER, UserRole.ADMIN]
)
require_cliente = require_viewer
