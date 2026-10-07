from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from supabase import Client
from app.services.supabase_client import get_supabase_client, get_supabase_admin_client
from app.api.dependencies.roles import require_admin
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# ------------------------------------------------------------------------------
# PROMO CODES SCHEMAS & ENDPOINTS
# ------------------------------------------------------------------------------

class PromoCodeCreate(BaseModel):
    code: str
    days_granted: int = 30

class PromoCodeResponse(BaseModel):
    id: str
    code: str
    days_granted: int
    is_active: bool
    created_at: datetime

@router.post("/promo-codes", response_model=PromoCodeResponse, dependencies=[Depends(require_admin)])
def create_promo_code(
    promo: PromoCodeCreate,
    supabase: Client = Depends(get_supabase_client)
):
    try:
        existing = supabase.table("promo_codes").select("id").eq("code", promo.code).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="El código ya existe.")

        res = supabase.table("promo_codes").insert({
            "code": promo.code,
            "days_granted": promo.days_granted,
            "is_active": True
        }).execute()

        if not res.data:
            raise HTTPException(status_code=500, detail="Error al crear el código promocional.")
            
        return res.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/promo-codes", response_model=List[PromoCodeResponse], dependencies=[Depends(require_admin)])
def list_promo_codes(
    supabase: Client = Depends(get_supabase_client)
):
    try:
        res = supabase.table("promo_codes").select("*").order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.patch("/promo-codes/{code_id}/deactivate", dependencies=[Depends(require_admin)])
def deactivate_promo_code(
    code_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    try:
        res = supabase.table("promo_codes").update({"is_active": False}).eq("id", code_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Código no encontrado.")
        return {"message": "Código desactivado exitosamente."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ------------------------------------------------------------------------------
# USER MANAGEMENT SCHEMAS & ENDPOINTS
# ------------------------------------------------------------------------------

class AdminUserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    tenant_id: str
    tenant_name: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "cliente"
    tenant_id: str

class AdminUserRoleUpdate(BaseModel):
    role: str

class AdminUserStatusUpdate(BaseModel):
    is_active: bool

@router.get("/users", response_model=List[AdminUserResponse], dependencies=[Depends(require_admin)])
def list_admin_users(
    admin_supabase: Client = Depends(get_supabase_admin_client),
    supabase: Client = Depends(get_supabase_client)
):
    client = admin_supabase or supabase
    if not client:
        raise HTTPException(status_code=500, detail="Cliente de base de datos no configurado.")
    try:
        res = client.table("user_profiles").select(
            "id, email, full_name, role, tenant_id, is_active, created_at, tenants(id, name)"
        ).order("created_at", desc=True).execute()

        users = []
        for row in (res.data or []):
            tenant_info = row.get("tenants")
            tenant_name = tenant_info.get("name") if isinstance(tenant_info, dict) else None
            users.append({
                "id": str(row["id"]),
                "email": row.get("email", ""),
                "full_name": row.get("full_name"),
                "role": row.get("role", "cliente"),
                "tenant_id": str(row.get("tenant_id", "")),
                "tenant_name": tenant_name,
                "is_active": row.get("is_active", True) if row.get("is_active") is not None else True,
                "created_at": row.get("created_at"),
            })
        return users
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al listar usuarios: {str(e)}"
        )

@router.post("/users", response_model=AdminUserResponse, dependencies=[Depends(require_admin)])
def create_admin_user(
    user_in: AdminUserCreate,
    admin_supabase: Client = Depends(get_supabase_admin_client)
):
    if not admin_supabase:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Se requiere Service Role Key para crear usuarios directamente."
        )

    valid_roles = ["administrador", "contador", "cliente"]
    if user_in.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rol inválido. Roles permitidos: {', '.join(valid_roles)}"
        )

    # Validar que exista el tenant
    tenant_res = admin_supabase.table("tenants").select("id, name").eq("id", user_in.tenant_id).execute()
    if not tenant_res.data:
        raise HTTPException(status_code=404, detail="La empresa/tenant especificada no existe.")
    tenant_name = tenant_res.data[0].get("name")

    try:
        # Crear en Auth con confirmación inmediata
        auth_res = admin_supabase.auth.admin.create_user({
            "email": user_in.email,
            "password": user_in.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": user_in.full_name,
                "role": user_in.role,
                "tenant_id": user_in.tenant_id
            }
        })
        if not auth_res.user:
            raise HTTPException(status_code=400, detail="No se pudo crear el usuario en Auth.")

        user_id = auth_res.user.id

        # Asegurar perfil en user_profiles
        profile_res = admin_supabase.table("user_profiles").upsert({
            "id": user_id,
            "email": user_in.email,
            "full_name": user_in.full_name,
            "role": user_in.role,
            "tenant_id": user_in.tenant_id,
            "is_active": True
        }, on_conflict="id").execute()

        created_data = profile_res.data[0] if profile_res.data else {
            "id": user_id,
            "email": user_in.email,
            "full_name": user_in.full_name,
            "role": user_in.role,
            "tenant_id": user_in.tenant_id,
            "is_active": True,
            "created_at": None
        }

        return {
            "id": str(created_data["id"]),
            "email": created_data["email"],
            "full_name": created_data.get("full_name"),
            "role": created_data.get("role", user_in.role),
            "tenant_id": str(created_data["tenant_id"]),
            "tenant_name": tenant_name,
            "is_active": created_data.get("is_active", True),
            "created_at": created_data.get("created_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al crear usuario: {str(e)}"
        )

@router.patch("/users/{user_id}/role", dependencies=[Depends(require_admin)])
def update_user_role(
    user_id: str,
    body: AdminUserRoleUpdate,
    admin_supabase: Client = Depends(get_supabase_admin_client)
):
    if not admin_supabase:
        raise HTTPException(status_code=500, detail="Service Role Key requerido.")

    valid_roles = ["administrador", "contador", "cliente"]
    if body.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rol inválido. Roles permitidos: {', '.join(valid_roles)}"
        )

    try:
        res = admin_supabase.table("user_profiles").update({"role": body.role}).eq("id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")

        try:
            admin_supabase.auth.admin.update_user_by_id(user_id, {
                "user_metadata": {"role": body.role}
            })
        except Exception:
            pass

        return {"message": f"Rol actualizado exitosamente a '{body.role}'."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/users/{user_id}/status", dependencies=[Depends(require_admin)])
def toggle_user_status(
    user_id: str,
    body: AdminUserStatusUpdate,
    admin_supabase: Client = Depends(get_supabase_admin_client)
):
    if not admin_supabase:
        raise HTTPException(status_code=500, detail="Service Role Key requerido.")

    try:
        res = admin_supabase.table("user_profiles").update({"is_active": body.is_active}).eq("id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")

        try:
            ban_duration = "none" if body.is_active else "876000h"
            admin_supabase.auth.admin.update_user_by_id(user_id, {
                "ban_duration": ban_duration
            })
        except Exception:
            pass

        action_msg = "activado" if body.is_active else "inactivado"
        return {"message": f"Usuario {action_msg} exitosamente."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/users/{user_id}", dependencies=[Depends(require_admin)])
def delete_user(
    user_id: str,
    admin_supabase: Client = Depends(get_supabase_admin_client)
):
    if not admin_supabase:
        raise HTTPException(status_code=500, detail="Service Role Key requerido.")

    try:
        try:
            admin_supabase.auth.admin.delete_user(user_id)
        except Exception:
            admin_supabase.table("user_profiles").delete().eq("id", user_id).execute()

        return {"message": "Usuario dado de baja y eliminado definitivamente."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al eliminar usuario: {str(e)}")
