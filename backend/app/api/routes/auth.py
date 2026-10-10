import logging
from datetime import datetime, timedelta, timezone
import jwt
import psycopg2
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.schemas.auth import (
    UserLogin, UserRegister, Token, UserResponse, UserInvite, 
    ForgotPasswordRequest, ResetPasswordRequest
)
from app.services.supabase_client import get_supabase_client, get_supabase_admin_client
from app.core.security import get_current_user
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

def create_jwt_token(user_id: str, email: str, role: str, tenant_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "aud": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=7)).timestamp()),
    }
    secret = settings.JWT_SECRET or settings.SUPABASE_KEY or settings.SUPABASE_ANON_KEY or "contabilidad-arturo-jwt-secret-key"
    return jwt.encode(payload, secret, algorithm="HS256")

@router.post("/invite")
def invite_user(
    invite_in: UserInvite,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    admin_supabase: Client = Depends(get_supabase_admin_client)
):
    # 1. Fetch current user profile to verify role and get tenant_id
    profile = supabase.table("user_profiles").select("*").eq("id", current_user.id).single().execute()
    if not profile.data or profile.data.get("role") not in ["contador", "administrador"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para realizar invitaciones."
        )
    tenant_id = profile.data.get("tenant_id")

    # Bypass para desarrollo local si MOCK_MODE está activo
    if settings.MOCK_MODE:
        return {"message": f"[MOCK] Invitación enviada exitosamente a {invite_in.email} para el tenant {tenant_id}"}

    if not admin_supabase:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuración de Administrador de Supabase incompleta (Service Role Key faltante)."
        )

    try:
        # 2. Perform the invitation via Supabase Auth Admin API
        # We inject the tenant_id and role into the raw_user_meta_data
        # so the DB trigger can pick it up.
        redirect_url = f"{settings.FRONTEND_URL}/auth/set-password"
        admin_supabase.auth.admin.invite_user_by_email(
            invite_in.email,
            {
                "data": {
                    "full_name": invite_in.full_name,
                    "role": invite_in.role,
                    "tenant_id": tenant_id
                },
                "redirectTo": redirect_url
            }
        )
        return {"message": f"Invitación enviada exitosamente a {invite_in.email}"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/register")
def register(
    user_in: UserRegister, 
    admin_supabase: Client = Depends(get_supabase_admin_client)
):
    # Bypass para desarrollo local si MOCK_MODE está activo
    if settings.MOCK_MODE:
        return {
            "message": "[MOCK] Usuario registrado exitosamente como Contador. Se enviaría correo de confirmación.",
            "user_id": "mock-user-uuid",
            "tenant_id": "mock-tenant-uuid"
        }

    if not admin_supabase:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuración de Administrador de Supabase incompleta (Service Role Key faltante)."
        )

    try:
        # 1. Crear el usuario en Supabase Auth
        # Usamos el admin client para poder asignar metadatos y asegurar el flujo
        auth_response = admin_supabase.auth.sign_up({
            "email": user_in.email,
            "password": user_in.password,
            "options": {
                "data": {
                    "full_name": user_in.full_name,
                    "tenant_name": user_in.tenant_name
                },
                "email_redirect_to": f"{settings.FRONTEND_URL}/dashboard"
            }
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Error al crear usuario en Supabase Auth")

        user_id = auth_response.user.id
        
        # 2. Crear el Tenant
        tenant_res = admin_supabase.table("tenants").insert({
            "name": user_in.tenant_name
        }).execute()
        
        if not tenant_res.data:
            raise HTTPException(status_code=500, detail="Error al crear el Tenant")
            
        tenant_id = tenant_res.data[0]['id']
        
        # 3. Crear/actualizar el User Profile como 'contador'
        # Nota: El trigger de Supabase puede haber creado el perfil automáticamente,
        # por eso usamos upsert para evitar conflictos de clave duplicada.
        profile_res = admin_supabase.table("user_profiles").upsert({
            "id": user_id,
            "tenant_id": tenant_id,
            "role": "contador",
            "full_name": user_in.full_name,
            "email": user_in.email
        }, on_conflict="id").execute()

        return {"message": "Usuario registrado exitosamente. Por favor, verifique su correo electrónico para confirmar su cuenta."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=Token)
def login(
    user_in: UserLogin,
    supabase: Client = Depends(get_supabase_client),
    admin_supabase: Client = Depends(get_supabase_admin_client)
):
    # 1. Autenticación nativa directa en PostgreSQL (VPS)
    db_url = settings.DATABASE_URL or settings.DIRECT_URL
    if db_url:
        try:
            conn = psycopg2.connect(db_url)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute("""
                SELECT u.id, u.email, p.role, p.tenant_id, p.is_active
                FROM auth.users u
                JOIN public.user_profiles p ON p.id = u.id
                WHERE LOWER(u.email) = LOWER(%s)
                  AND u.encrypted_password = crypt(%s, u.encrypted_password);
            """, (user_in.email, user_in.password))
            row = cur.fetchone()
            cur.close()
            conn.close()

            if row:
                user_id, email, role, tenant_id, is_active = row
                if is_active is False:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Tu cuenta de usuario ha sido desactivada. Contacta al administrador."
                    )
                token = create_jwt_token(
                    user_id=str(user_id),
                    email=str(email),
                    role=str(role),
                    tenant_id=str(tenant_id)
                )
                return {
                    "access_token": token,
                    "token_type": "bearer"
                }
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Intento de autenticación local con PostgreSQL falló: {e}")

    # 2. Fallback a Supabase si está disponible
    if supabase is not None:
        try:
            auth_response = supabase.auth.sign_in_with_password({
                "email": user_in.email,
                "password": user_in.password,
            })
            if not auth_response.session or not auth_response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Credenciales incorrectas."
                )

            client = admin_supabase or supabase
            profile_res = client.table("user_profiles").select("is_active").eq("id", auth_response.user.id).single().execute()
            if profile_res.data and profile_res.data.get("is_active") is False:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tu cuenta de usuario ha sido desactivada. Contacta al administrador."
                )

            return {
                "access_token": auth_response.session.access_token,
                "token_type": "bearer"
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e),
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales incorrectas (correo o contraseña no válidos)."
    )

@router.get("/me", response_model=UserResponse)
def get_me(
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    # 1. Consultar PostgreSQL directamente (VPS)
    db_url = settings.DATABASE_URL or settings.DIRECT_URL
    if db_url:
        try:
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute("""
                SELECT p.id, p.email, p.full_name, p.role, p.tenant_id, t.trial_ends_at
                FROM public.user_profiles p
                LEFT JOIN public.tenants t ON t.id = p.tenant_id
                WHERE p.id = %s;
            """, (current_user.id,))
            row = cur.fetchone()
            cur.close()
            conn.close()
            if row:
                return {
                    "id": str(row[0]),
                    "email": row[1],
                    "full_name": row[2],
                    "role": row[3],
                    "tenant_id": str(row[4]) if row[4] else None,
                    "trial_ends_at": row[5].isoformat() if row[5] else None,
                }
        except Exception as e:
            logger.warning(f"Error consultando /me en PostgreSQL: {e}")

    # 2. Fallback a Supabase si está disponible
    if supabase is not None:
        try:
            profile_res = supabase.table("user_profiles").select("*").eq("id", current_user.id).single().execute()
            profile = profile_res.data
            
            tenant_id = profile.get("tenant_id")
            trial_ends_at = None
            if tenant_id:
                tenant_res = supabase.table("tenants").select("trial_ends_at").eq("id", tenant_id).single().execute()
                if tenant_res.data:
                    trial_ends_at = tenant_res.data.get("trial_ends_at")

            return {
                "id": current_user.id,
                "email": current_user.email,
                "full_name": profile.get("full_name"),
                "role": profile.get("role"),
                "tenant_id": tenant_id,
                "trial_ends_at": trial_ends_at
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Perfil de usuario no encontrado."
    )

@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    supabase: Client = Depends(get_supabase_client)
):
    # Bypass para desarrollo local si MOCK_MODE está activo
    if settings.MOCK_MODE:
        return {"message": f"[MOCK] Enlace de recuperación enviado a {request.email} (Redirect: {settings.FRONTEND_URL}/reset-password)"}

    try:
        # redirectTo debe coincidir con uno de los dominios permitidos en Supabase
        redirect_url = f"{settings.FRONTEND_URL}/reset-password"
        
        # En gotrue-python v2.x el parámetro es 'options' y contiene 'redirect_to'
        supabase.auth.reset_password_for_email(
            request.email,
            options={"redirect_to": redirect_url}
        )
        return {"message": "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."}
    except Exception as e:
        # Registramos el error real en los logs del servidor
        print(f"Error crítico en forgot_password para {request.email}: {type(e).__name__}: {e}")
        # Retornamos el mismo mensaje por seguridad (evitar user enumeration)
        return {"message": "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."}

@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Este endpoint requiere que el usuario ya tenga una sesión activa.
    Supabase crea una sesión automáticamente al hacer clic en el enlace de recuperación.
    """
    try:
        supabase.auth.update_user({"password": request.password})
        return {"message": "Contraseña actualizada exitosamente."}
    except Exception as e:
        print(f"Error en reset_password para {current_user.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo actualizar la contraseña: {str(e)}"
        )
