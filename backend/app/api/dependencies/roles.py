from enum import Enum
from fastapi import Depends, HTTPException, status, Request
from supabase import Client
from app.core.security import get_current_user
from app.services.supabase_client import get_supabase_client
from app.core.config import settings

class UserRole(str, Enum):
    ADMIN = "admin"
    CONTADOR = "contador"
    VIEWER = "viewer"
    OWNER = "owner"

def get_tenant_from_request(request: Request):
    if settings.MOCK_MODE:
        mock_id = request.headers.get("X-Mock-Tenant-ID")
        if mock_id:
            return mock_id
    return None

class RoleChecker:
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(
        self,
        request: Request,
        supabase: Client = Depends(get_supabase_client)
    ):
        mock_tenant_id = get_tenant_from_request(request)
        if mock_tenant_id:
            return {"user": None, "tenant_id": mock_tenant_id, "role": "admin"}
            
        # Peticion a la base de datos para obtener el perfil del usuario activo
        # Manualmente llamamos a get_current_user o extraemos el token
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
            
        token = auth_header.split(" ")[1]
        try:
            res = supabase.auth.get_user(token)
            if not res.user:
                raise HTTPException(status_code=401, detail="Invalid token")
            current_user = res.user
            supabase.postgrest.auth(token)
        except Exception as e:
            raise HTTPException(status_code=401, detail=str(e))

        try:
            profile_res = supabase.table("user_profiles").select("role, tenant_id").eq("id", current_user.id).single().execute()

            if not profile_res.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Perfil de usuario no encontrado."
                )

            user_role = profile_res.data.get("role")
            tenant_id = profile_res.data.get("tenant_id")

            if user_role not in [role.value for role in self.allowed_roles]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"No tienes permisos suficientes. Se requiere uno de los siguientes roles: {[r.value for r in self.allowed_roles]}"
                )

            return {"user": current_user, "tenant_id": tenant_id, "role": user_role}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Error validando rol: {str(e)}"
            )

# Dependencias especificas para uso comun
require_admin = RoleChecker([UserRole.ADMIN])
require_contador = RoleChecker([UserRole.CONTADOR, UserRole.ADMIN, UserRole.OWNER])
require_owner = RoleChecker([UserRole.OWNER, UserRole.ADMIN])
require_viewer = RoleChecker([UserRole.VIEWER, UserRole.CONTADOR, UserRole.OWNER, UserRole.ADMIN])

# Alias para compatibilidad con rutas existentes
require_cliente = require_viewer
