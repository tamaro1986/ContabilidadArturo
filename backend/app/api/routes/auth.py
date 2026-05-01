from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.schemas.auth import UserLogin, UserRegister, Token, UserResponse
from app.services.supabase_client import get_supabase_client
from app.core.security import get_current_user

router = APIRouter()

@router.post("/register")
def register(
    user_in: UserRegister, 
    supabase: Client = Depends(get_supabase_client)
):
    try:
        # 1. Crear el usuario en Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_in.email,
            "password": user_in.password,
        })
        
        user_id = auth_response.user.id
        
        # 2. Crear el Tenant
        # Nota: Normalmente deberías usar el service_role key para operaciones privilegiadas
        # si las políticas RLS no permiten insertar libremente, pero para el registro 
        # asumiendo que está permitido o usamos backend:
        tenant_res = supabase.table("tenants").insert({
            "name": user_in.tenant_name
        }).execute()
        
        tenant_id = tenant_res.data[0]['id']
        
        # 3. Crear el User Profile como 'contador'
        profile_res = supabase.table("user_profiles").insert({
            "id": user_id,
            "tenant_id": tenant_id,
            "role": "contador",
            "full_name": user_in.full_name,
            "email": user_in.email
        }).execute()

        return {"message": "Usuario registrado exitosamente como Contador"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.post("/login", response_model=Token)
def login(
    user_in: UserLogin,
    supabase: Client = Depends(get_supabase_client)
):
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": user_in.email,
            "password": user_in.password,
        })
        return {
            "access_token": auth_response.session.access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

@router.get("/me", response_model=UserResponse)
def get_me(
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    # Ya estamos autenticados y supabase.postgrest.auth(token) fue llamado en get_current_user
    # por lo que el RLS aplicará aquí
    try:
        profile_res = supabase.table("user_profiles").select("*").eq("id", current_user.id).single().execute()
        return {
            "id": current_user.id,
            "email": current_user.email,
            "role": profile_res.data.get("role"),
            "tenant_id": profile_res.data.get("tenant_id")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
