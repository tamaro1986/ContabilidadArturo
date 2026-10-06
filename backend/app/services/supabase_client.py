from typing import Optional

from supabase import Client, create_client

from app.core.config import settings


def get_supabase_client() -> Optional[Client]:
    url = settings.SUPABASE_URL or settings.NEXT_PUBLIC_SUPABASE_URL
    key = (
        settings.SUPABASE_KEY
        or settings.SUPABASE_ANON_KEY
        or settings.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    if not url or not key:
        return None
    return create_client(url, key)


def get_supabase_admin_client() -> Optional[Client]:
    url = settings.SUPABASE_URL or settings.NEXT_PUBLIC_SUPABASE_URL
    service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
    if not url or not service_role_key:
        return None
    return create_client(url, service_role_key)
