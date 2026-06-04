from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from supabase import Client
from app.services.supabase_client import get_supabase_client, get_supabase_admin_client
from app.api.dependencies.roles import require_contador

router = APIRouter()

class ApplyCouponRequest(BaseModel):
    code: str

@router.post("/apply-coupon", dependencies=[Depends(require_contador)])
def apply_coupon(
    request: Request,
    coupon_in: ApplyCouponRequest,
    supabase: Client = Depends(get_supabase_client),
    admin_supabase: Client = Depends(get_supabase_admin_client)
):
    try:
        # Extraer información del usuario a partir de dependencias
        # Como usamos require_contador, podemos estar seguros que la cabecera Authorization existe
        # Pero require_contador devuelve el perfil internamente, no lo inyecta a la request directamente.
        # Necesitamos obtener el tenant_id. Vamos a llamar al endpoint de roles manual o extraer el JWT de nuevo
        
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(status_code=401, detail="Unauthorized")
        token = auth_header.split(" ")[1]
        
        # Obtener el usuario actual para sacar su tenant_id
        user_res = supabase.auth.get_user(token)
        if not user_res.user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        profile_res = supabase.table("user_profiles").select("tenant_id").eq("id", user_res.user.id).single().execute()
        if not profile_res.data:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        tenant_id = profile_res.data.get("tenant_id")

        # 1. Validar el cupón
        coupon_res = supabase.table("promo_codes").select("*").eq("code", coupon_in.code).eq("is_active", True).execute()
        if not coupon_res.data:
            raise HTTPException(status_code=400, detail="Cupón inválido o inactivo.")
        
        coupon = coupon_res.data[0]
        days_granted = coupon["days_granted"]

        # Usamos RPC (Stored Procedure) o hacemos la suma en python. 
        # Lo haremos en python por simplicidad, usando la fecha actual del tenant
        tenant_res = supabase.table("tenants").select("trial_ends_at").eq("id", tenant_id).single().execute()
        if not tenant_res.data:
            raise HTTPException(status_code=404, detail="Tenant no encontrado.")
            
        current_trial_ends = tenant_res.data.get("trial_ends_at")
        
        # Si ya expiró, sumar a partir de HOY. Si no ha expirado, sumar a la FECHA ACTUAL DE EXPIRACION.
        # Para simplificar y hacerlo seguro, lo haremos vía RPC en Postgres.
        # PERO si no tenemos RPC, llamamos a la API update.
        
        # Una forma más sencilla sin RPC:
        # En Postgres: update tenants set trial_ends_at = GREATEST(trial_ends_at, NOW()) + INTERVAL 'X days'
        # Supabase Python no soporta sentencias crudas fácilmente sin RPC.
        # Crearemos un RPC inline si no existe, o simplemente haremos fetch, math en python, y update.
        
        from datetime import datetime, timedelta, timezone
        
        now = datetime.now(timezone.utc)
        
        if current_trial_ends:
            # Parse ISO 8601 (Supabase returns strings like '2026-05-16T00:00:00+00:00')
            try:
                # Handle potential format issues
                trial_ends_dt = datetime.fromisoformat(current_trial_ends.replace('Z', '+00:00'))
                if trial_ends_dt < now:
                    new_trial_ends = now + timedelta(days=days_granted)
                else:
                    new_trial_ends = trial_ends_dt + timedelta(days=days_granted)
            except Exception:
                 new_trial_ends = now + timedelta(days=days_granted)
        else:
            new_trial_ends = now + timedelta(days=days_granted)

        # Update tenant
        update_res = admin_supabase.table("tenants").update({
            "trial_ends_at": new_trial_ends.isoformat()
        }).eq("id", tenant_id).execute()

        if not update_res.data:
            raise HTTPException(status_code=500, detail="Error al actualizar la membresía del despacho.")
            
        # Opcional: Marcar el cupón como inactivo si es de un solo uso?
        # En la DB de Arturo, is_active=True parece indicar que cualquiera lo puede usar
        # Si se quiere que sea de un solo uso, lo desactivamos:
        # supabase.table("promo_codes").update({"is_active": False}).eq("id", coupon["id"]).execute()
        
        return {
            "message": f"Membresía extendida por {days_granted} días exitosamente.",
            "new_expiration_date": new_trial_ends.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
