import duckdb
import os
from dotenv import load_dotenv

load_dotenv()

# db_url = os.getenv("DATABASE_URL")
db_url = "postgresql://postgres:Sofia%2420145@db.hujxihigwjjapiuapefd.supabase.co:5432/postgres"
print(f"Testing connection to: {db_url}")

try:
    con = duckdb.connect(database=':memory:')
    print("Installing postgres extension...")
    con.execute("INSTALL postgres;")
    print("Loading postgres extension...")
    con.execute("LOAD postgres;")
    
    print("Attempting to ATTACH...")
    con.execute(f"ATTACH '{db_url}' AS pg (TYPE POSTGRES);")
    print("ATTACH successful!")
    
    print("Querying schemas...")
    res = con.execute("SELECT schema_name FROM information_schema.schemata").fetchall()
    print(f"Schemas: {res}")
    
except Exception as e:
    print(f"ERROR: {e}")
