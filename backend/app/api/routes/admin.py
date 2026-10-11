import logging
import uuid
from datetime import datetime
from typing import List, Optional
import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from supabase import Client
from app.services.supabase_client import get_supabase_client, get_supabase_admin_client
from app.api.dependencies.roles import require_admin
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


def get_pg_conn():
    db_url = settings.DATABASE_URL or settings.DIRECT_URL
    if db_url:
        try:
            conn = psycopg2.connect(db_url)
            conn.autocommit = True
            return conn
        except Exception:
            return None
    return None


# ------------------------------------------------------------------------------
# PROMO CODES SCHEMAS & ENDPOINTS
# ------------------------------------------------------------------------------

class PromoCodeCreate(BaseModel):
    code: str
    days_granted: int = 30
    tenant_id: Optional[str] = None


class PromoCodeResponse(BaseModel):
    id: str
    code: str
    days_granted: int
    is_active: bool
    created_at: Optional[datetime] = None


@router.post("/promo-codes", response_model=PromoCodeResponse, dependencies=[Depends(require_admin)])
def create_promo_code(
    promo: PromoCodeCreate,
    supabase: Client = Depends(get_supabase_client)
):
    conn = get_pg_conn()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("SELECT id FROM public.promo_codes WHERE code = %s", (promo.code,))
            if cur.fetchone():
                cur.close()
                conn.close()
                raise HTTPException(status_code=400, detail="El código ya existe.")
            cur.execute("""
                INSERT INTO public.promo_codes (code, days_granted, is_active, tenant_id)
                VALUES (%s, %s, TRUE, %s)
                RETURNING id, code, days_granted, is_active, created_at;
            """, (promo.code.upper(), promo.days_granted, promo.tenant_id))
            row = cur.fetchone()
            cur.close()
            conn.close()
            return {
                "id": str(row[0]),
                "code": row[1],
                "days_granted": row[2],
                "is_active": row[3],
                "created_at": row[4],
            }
        except HTTPException:
            raise
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=400, detail=str(e))

    if supabase:
        try:
            existing = supabase.table("promo_codes").select("id").eq("code", promo.code).execute()
            if existing.data:
                raise HTTPException(status_code=400, detail="El código ya existe.")

            res = supabase.table("promo_codes").insert({
                "code": promo.code.upper(),
                "days_granted": promo.days_granted,
                "is_active": True,
                "tenant_id": promo.tenant_id
            }).execute()

            if not res.data:
                raise HTTPException(status_code=500, detail="Error al crear el código promocional.")
            return res.data[0]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    raise HTTPException(status_code=500, detail="Servicio de base de datos no disponible.")


@router.get("/promo-codes", response_model=List[PromoCodeResponse], dependencies=[Depends(require_admin)])
def list_promo_codes(
    supabase: Client = Depends(get_supabase_client)
):
    conn = get_pg_conn()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, code, days_granted, is_active, created_at FROM public.promo_codes ORDER BY created_at DESC;")
            rows = cur.fetchall()
            cur.close()
            conn.close()
            return [
                {
                    "id": str(r[0]),
                    "code": r[1],
                    "days_granted": r[2],
                    "is_active": r[3],
                    "created_at": r[4],
                }
                for r in rows
            ]
        except Exception as e:
            conn.close()
            logger.warning(f"Error list_promo_codes en Postgres: {e}")

    if supabase:
        try:
            res = supabase.table("promo_codes").select("*").order("created_at", desc=True).execute()
            return res.data
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    return []


@router.patch("/promo-codes/{code_id}/toggle", dependencies=[Depends(require_admin)])
def toggle_promo_code(
    code_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    conn = get_pg_conn()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("UPDATE public.promo_codes SET is_active = NOT is_active WHERE id = %s RETURNING is_active;", (code_id,))
            row = cur.fetchone()
            cur.close()
            conn.close()
            if not row:
                raise HTTPException(status_code=404, detail="Código no encontrado.")
            return {"is_active": row[0]}
        except HTTPException:
            raise
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=400, detail=str(e))

    if supabase:
        try:
            res = supabase.table("promo_codes").select("is_active").eq("id", code_id).single().execute()
            if not res.data:
                raise HTTPException(status_code=404, detail="Código no encontrado.")
            new_status = not res.data["is_active"]
            supabase.table("promo_codes").update({"is_active": new_status}).eq("id", code_id).execute()
            return {"is_active": new_status}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    raise HTTPException(status_code=500, detail="Base de datos no disponible.")


# ------------------------------------------------------------------------------
# TENANTS MANAGEMENT
# ------------------------------------------------------------------------------

class AdminTenantResponse(BaseModel):
    id: str
    name: str
    trial_ends_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


@router.get("/tenants", response_model=List[AdminTenantResponse], dependencies=[Depends(require_admin)])
def list_admin_tenants(
    admin_supabase: Client = Depends(get_supabase_admin_client),
    supabase: Client = Depends(get_supabase_client)
):
    conn = get_pg_conn()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, name, trial_ends_at, created_at FROM public.tenants ORDER BY name ASC;")
            rows = cur.fetchall()
            cur.close()
            conn.close()
            return [
                {
                    "id": str(r[0]),
                    "name": r[1],
                    "trial_ends_at": r[2],
                    "created_at": r[3],
                }
                for r in rows
            ]
        except Exception as e:
            conn.close()
            logger.warning(f"Error al listar tenants en Postgres: {e}")

    client = admin_supabase or supabase
    if client:
        try:
            res = client.table("tenants").select("*").order("name").execute()
        except Exception as e:
            logger.warning(f"Error al listar tenants en Supabase: {e}")
    return []


class ExtendTrialRequest(BaseModel):
    days: int = 30


@router.patch("/tenants/{tenant_id}/trial", dependencies=[Depends(require_admin)])
def extend_tenant_trial(
    tenant_id: str,
    body: ExtendTrialRequest,
):
    conn = get_pg_conn()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("""
                UPDATE public.tenants
                SET trial_ends_at = GREATEST(COALESCE(trial_ends_at, NOW()), NOW()) + (%s || ' days')::INTERVAL
                WHERE id = %s
                RETURNING trial_ends_at;
            """, (body.days, tenant_id))
            row = cur.fetchone()
            cur.close()
            conn.close()
            if not row:
                raise HTTPException(status_code=404, detail="Tenant no encontrado.")
            return {"message": "Membresía extendida exitosamente.", "trial_ends_at": row[0]}
        except HTTPException:
            raise
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=400, detail=str(e))
    raise HTTPException(status_code=500, detail="Base de datos no disponible.")


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
    conn = get_pg_conn()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT p.id, p.email, p.full_name, p.role, p.tenant_id, t.name, p.is_active, p.created_at
                FROM public.user_profiles p
                LEFT JOIN public.tenants t ON t.id = p.tenant_id
                ORDER BY p.created_at DESC NULLS LAST;
            """)
            rows = cur.fetchall()
            cur.close()
            conn.close()
            return [
                {
                    "id": str(r[0]),
                    "email": r[1] or "",
                    "full_name": r[2],
                    "role": r[3] or "cliente",
                    "tenant_id": str(r[4] or ""),
                    "tenant_name": r[5],
                    "is_active": r[6] if r[6] is not None else True,
                    "created_at": r[7],
                }
                for r in rows
            ]
        except Exception as e:
            conn.close()
            logger.warning(f"Error en list_admin_users vía Postgres: {e}")

    client = admin_supabase or supabase
    if client:
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

    return []


@router.post("/users", response_model=AdminUserResponse, dependencies=[Depends(require_admin)])
def create_admin_user(
    user_in: AdminUserCreate,
    admin_supabase: Client = Depends(get_supabase_admin_client)
):
    valid_roles = ["administrador", "contador", "cliente"]
    if user_in.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rol inválido. Roles permitidos: {', '.join(valid_roles)}"
        )

    conn = get_pg_conn()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, name FROM public.tenants WHERE id = %s", (user_in.tenant_id,))
            tenant_row = cur.fetchone()
            if not tenant_row:
                cur.close()
                conn.close()
                raise HTTPException(status_code=404, detail="La empresa/tenant especificada no existe.")
            tenant_name = tenant_row[1]

            # Verificar si email ya existe
            cur.execute("SELECT id FROM auth.users WHERE LOWER(email) = LOWER(%s)", (user_in.email,))
            if cur.fetchone():
                cur.close()
                conn.close()
                raise HTTPException(status_code=400, detail="Ya existe un usuario con este correo electrónico.")

            user_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO auth.users (
                    id, email, encrypted_password, email_confirmed_at, raw_user_meta_data
                ) VALUES (
                    %s, %s, crypt(%s, gen_salt('bf')), NOW(), %s
                );
            """, (
                user_id,
                user_in.email,
                user_in.password,
                psycopg2.extras.Json({
                    "full_name": user_in.full_name,
                    "role": user_in.role,
                    "tenant_id": user_in.tenant_id
                })
            ))

            cur.execute("""
                INSERT INTO public.user_profiles (id, email, full_name, role, tenant_id, is_active)
                VALUES (%s, %s, %s, %s, %s, TRUE)
                ON CONFLICT (id) DO UPDATE SET
                    email = EXCLUDED.email,
                    full_name = EXCLUDED.full_name,
                    role = EXCLUDED.role,
                    tenant_id = EXCLUDED.tenant_id,
                    is_active = TRUE
                RETURNING created_at;
            """, (user_id, user_in.email, user_in.full_name, user_in.role, user_in.tenant_id))
            prof_row = cur.fetchone()
            created_at = prof_row[0] if prof_row else datetime.now()
            cur.close()
            conn.close()

            return {
                "id": user_id,
                "email": user_in.email,
                "full_name": user_in.full_name,
                "role": user_in.role,
                "tenant_id": user_in.tenant_id,
                "tenant_name": tenant_name,
                "is_active": True,
                "created_at": created_at,
            }
        except HTTPException:
            raise
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=400, detail=f"Error al crear usuario: {str(e)}")

    if admin_supabase:
        tenant_res = admin_supabase.table("tenants").select("id, name").eq("id", user_in.tenant_id).execute()
        if not tenant_res.data:
            raise HTTPException(status_code=404, detail="La empresa/tenant especificada no existe.")
        tenant_name = tenant_res.data[0].get("name")

        try:
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

    raise HTTPException(status_code=500, detail="Servicio de base de datos no disponible.")


@router.patch("/users/{user_id}/role", dependencies=[Depends(require_admin)])
def update_user_role(
    user_id: str,
    body: AdminUserRoleUpdate,
    admin_supabase: Client = Depends(get_supabase_admin_client)
):
    valid_roles = ["administrador", "contador", "cliente"]
    if body.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rol inválido. Roles permitidos: {', '.join(valid_roles)}"
        )

    conn = get_pg_conn()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("UPDATE public.user_profiles SET role = %s WHERE id = %s RETURNING id", (body.role, user_id))
            row = cur.fetchone()
            cur.close()
            conn.close()
            if not row:
                raise HTTPException(status_code=404, detail="Usuario no encontrado.")
            return {"message": f"Rol actualizado exitosamente a '{body.role}'."}
        except HTTPException:
            raise
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=400, detail=str(e))

    if admin_supabase:
        try:
            res = admin_supabase.table("user_profiles").update({"role": body.role}).eq("id", user_id).execute()
            if not res.data:
                raise HTTPException(status_code=404, detail="Usuario no encontrado.")
            return {"message": f"Rol actualizado exitosamente a '{body.role}'."}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    raise HTTPException(status_code=500, detail="Base de datos no disponible.")


@router.patch("/users/{user_id}/status", dependencies=[Depends(require_admin)])
def toggle_user_status(
    user_id: str,
    body: AdminUserStatusUpdate,
    admin_supabase: Client = Depends(get_supabase_admin_client)
):
    conn = get_pg_conn()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("UPDATE public.user_profiles SET is_active = %s WHERE id = %s RETURNING id", (body.is_active, user_id))
            row = cur.fetchone()
            cur.close()
            conn.close()
            if not row:
                raise HTTPException(status_code=404, detail="Usuario no encontrado.")
            action_msg = "activado" if body.is_active else "inactivado"
            return {"message": f"Usuario {action_msg} exitosamente."}
        except HTTPException:
            raise
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=400, detail=str(e))

    if admin_supabase:
        try:
            res = admin_supabase.table("user_profiles").update({"is_active": body.is_active}).eq("id", user_id).execute()
            if not res.data:
                raise HTTPException(status_code=404, detail="Usuario no encontrado.")
            action_msg = "activado" if body.is_active else "inactivado"
            return {"message": f"Usuario {action_msg} exitosamente."}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    raise HTTPException(status_code=500, detail="Base de datos no disponible.")


@router.delete("/users/{user_id}", dependencies=[Depends(require_admin)])
def delete_user(
    user_id: str,
    admin_supabase: Client = Depends(get_supabase_admin_client)
):
    conn = get_pg_conn()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM auth.users WHERE id = %s RETURNING id", (user_id,))
            del_auth = cur.fetchone()
            if not del_auth:
                cur.execute("DELETE FROM public.user_profiles WHERE id = %s RETURNING id", (user_id,))
            cur.close()
            conn.close()
            return {"message": "Usuario dado de baja y eliminado definitivamente."}
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=400, detail=f"Error al eliminar usuario: {str(e)}")

    if admin_supabase:
        try:
            try:
                admin_supabase.auth.admin.delete_user(user_id)
            except Exception:
                admin_supabase.table("user_profiles").delete().eq("id", user_id).execute()
            return {"message": "Usuario dado de baja y eliminado definitivamente."}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error al eliminar usuario: {str(e)}")

    raise HTTPException(status_code=500, detail="Base de datos no disponible.")


# ------------------------------------------------------------------------------
# AUDITORÍA DE EMPRESAS Y TRAZABILIDAD GLOBAL
# ------------------------------------------------------------------------------

class AdminCompanyResponse(BaseModel):
    id: str
    tenant_id: str
    tenant_name: Optional[str] = None
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    name: str
    nit: str
    total_records: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AdminStatsResponse(BaseModel):
    total_users: int = 0
    total_contadores: int = 0
    total_clientes: int = 0
    total_admins: int = 0
    total_companies: int = 0
    total_uploads: int = 0
    total_records: int = 0


class AdminUploadAuditResponse(BaseModel):
    id: str
    tenant_id: str
    company_name: Optional[str] = None
    document_type: str
    filename: str
    status: str
    records_processed: int = 0
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None


@router.get("/companies", response_model=List[AdminCompanyResponse], dependencies=[Depends(require_admin)])
def list_admin_companies():
    conn = get_pg_conn()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    c.id, c.tenant_id, t.name as tenant_name, c.user_id, p.email as user_email,
                    c.name, c.nit,
                    COALESCE((SELECT COUNT(*) FROM public.financial_records fr WHERE fr.company_id = c.id), 0) as total_records,
                    c.created_at, c.updated_at
                FROM public.companies c
                LEFT JOIN public.tenants t ON t.id = c.tenant_id
                LEFT JOIN public.user_profiles p ON p.id = c.user_id
                ORDER BY c.name ASC;
            """)
            rows = cur.fetchall()
            cur.close()
            conn.close()
            return [
                {
                    "id": str(r[0]),
                    "tenant_id": str(r[1]),
                    "tenant_name": r[2],
                    "user_id": str(r[3]) if r[3] else None,
                    "user_email": r[4],
                    "name": r[5],
                    "nit": r[6],
                    "total_records": int(r[7] or 0),
                    "created_at": r[8],
                    "updated_at": r[9],
                }
                for r in rows
            ]
        except Exception as e:
            conn.close()
            logger.warning(f"Error list_admin_companies en Postgres: {e}")
            return []
    return []


@router.get("/stats", response_model=AdminStatsResponse, dependencies=[Depends(require_admin)])
def get_admin_stats():
    conn = get_pg_conn()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT
                    COUNT(id) as total_users,
                    COUNT(id) FILTER (WHERE role = 'contador') as total_contadores,
                    COUNT(id) FILTER (WHERE role = 'cliente') as total_clientes,
                    COUNT(id) FILTER (WHERE role = 'administrador') as total_admins
                FROM public.user_profiles;
            """)
            u_row = cur.fetchone() or (0, 0, 0, 0)
            
            cur.execute("SELECT COUNT(id) FROM public.companies;")
            c_row = cur.fetchone() or (0,)
            
            cur.execute("SELECT COUNT(id) FROM public.csv_upload_history;")
            up_row = cur.fetchone() or (0,)
            
            cur.execute("SELECT COUNT(id) FROM public.financial_records;")
            r_row = cur.fetchone() or (0,)
            
            cur.close()
            conn.close()
            return {
                "total_users": int(u_row[0] or 0),
                "total_contadores": int(u_row[1] or 0),
                "total_clientes": int(u_row[2] or 0),
                "total_admins": int(u_row[3] or 0),
                "total_companies": int(c_row[0] or 0),
                "total_uploads": int(up_row[0] or 0),
                "total_records": int(r_row[0] or 0),
            }
        except Exception as e:
            conn.close()
            logger.warning(f"Error get_admin_stats en Postgres: {e}")
            return {
                "total_users": 0,
                "total_contadores": 0,
                "total_clientes": 0,
                "total_admins": 0,
                "total_companies": 0,
                "total_uploads": 0,
                "total_records": 0,
            }
    return {
        "total_users": 0,
        "total_contadores": 0,
        "total_clientes": 0,
        "total_admins": 0,
        "total_companies": 0,
        "total_uploads": 0,
        "total_records": 0,
    }


@router.get("/uploads", response_model=List[AdminUploadAuditResponse], dependencies=[Depends(require_admin)])
def list_admin_uploads():
    conn = get_pg_conn()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    h.id, h.tenant_id, c.name as company_name, h.document_type,
                    h.filename, h.status, h.records_processed, h.error_message, h.created_at
                FROM public.csv_upload_history h
                LEFT JOIN public.companies c ON c.id = h.company_id
                ORDER BY h.created_at DESC
                LIMIT 100;
            """)
            rows = cur.fetchall()
            cur.close()
            conn.close()
            return [
                {
                    "id": str(r[0]),
                    "tenant_id": str(r[1]),
                    "company_name": r[2],
                    "document_type": r[3],
                    "filename": r[4],
                    "status": r[5],
                    "records_processed": int(r[6] or 0),
                    "error_message": r[7],
                    "created_at": r[8],
                }
                for r in rows
            ]
        except Exception as e:
            conn.close()
            logger.warning(f"Error list_admin_uploads en Postgres: {e}")
            return []
    return []

