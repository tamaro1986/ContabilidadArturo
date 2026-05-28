import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

try:
    res = supabase.table("user_profiles").select("*").limit(1).execute()
    print("Table user_profiles exists")
    print(f"Sample: {res.data}")
except Exception as e:
    print(f"Table user_profiles likely does not exist: {e}")
