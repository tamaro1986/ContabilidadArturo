from supabase import create_client, Client
from app.core.config import settings

def get_supabase_client() -> Client:
    url: str = settings.SUPABASE_URL
    key: str = settings.SUPABASE_KEY or settings.SUPABASE_ANON_KEY
    if not url or not key: return None
    return create_client(url, key)

def get_supabase_admin_client() -> Client:
    url: str = settings.SUPABASE_URL
    service_role_key: str = settings.SUPABASE_SERVICE_ROLE_KEY
    if not url or not service_role_key: return None
    return create_client(url, service_role_key)
