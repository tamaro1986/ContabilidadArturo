from app.core.config import settings
import os

print(f"SUPABASE_URL: {'Set' if settings.SUPABASE_URL else 'Empty'}")
print(f"SUPABASE_KEY: {'Set' if settings.SUPABASE_KEY else 'Empty'}")
print(f"MOCK_MODE: {settings.MOCK_MODE}")
print(f"Env vars in OS: {os.environ.get('SUPABASE_URL') is not None}")
