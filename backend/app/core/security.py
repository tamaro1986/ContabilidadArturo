from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.services.supabase_client import get_supabase_client

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    token = credentials.credentials
    try:
        # En Supabase Python SDK, puedes hacer set_session o usar el auth_api
        # para validar el token y obtener el usuario.
        res = supabase.auth.get_user(token)
        if not res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        
        # Para que las peticiones a la DB de Supabase usen este usuario (RLS):
        # Configuramos el token en la instancia del cliente para las siguientes consultas.
        supabase.postgrest.auth(token)
        
        return res.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
