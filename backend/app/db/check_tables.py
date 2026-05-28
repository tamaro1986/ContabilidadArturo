import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

# Check for table existence by attempting a simple select
try:
    res = supabase.table("financial_uploads").select("*").limit(1).execute()
    print("Table financial_uploads exists")
except Exception as e:
    print(f"Table financial_uploads likely does not exist: {e}")

try:
    res = supabase.table("profiles").select("*").limit(1).execute()
    print("Table profiles exists")
except Exception as e:
    print(f"Table profiles likely does not exist: {e}")
