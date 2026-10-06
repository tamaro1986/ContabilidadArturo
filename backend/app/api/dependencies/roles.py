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
        supabase = session["supabase"]
        if current_user is None or supabase is None:
            raise ApiException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                code="AUTH_REQUIRED",
                detail="Autenticación requerida.",
            )

        try:
            profile_response = (
                supabase.table("user_profiles")
                .select("role, tenant_id")
                .eq("id", current_user.id)
                .single()
                .execute()
            )
        except Exception:
            logger.exception("No se pudo obtener el perfil RBAC del usuario")
            raise ApiException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                code="PROFILE_LOOKUP_FAILED",
                detail="No se pudo validar el perfil del usuario.",
            )

        if not profile_response.data:
            raise ApiException(
                status_code=status.HTTP_404_NOT_FOUND,
                code="PROFILE_NOT_FOUND",
                detail="Perfil de usuario no encontrado.",
            )

        user_role = profile_response.data.get("role")
        tenant_id = profile_response.data.get("tenant_id")
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
    [UserRole.VIEWER, UserRole.CONTADOR, UserRole.OWNER, UserRole.ADMIN]
)
require_cliente = require_viewer
