import os
import duckdb
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
print(f"Testing connection to: {db_url}")

try:
    con = duckdb.connect(database=':memory:')
    con.execute("INSTALL postgres;")
    con.execute("LOAD postgres;")
    con.execute(f"ATTACH '{db_url}' AS pg (TYPE POSTGRES);")
    print("Success! Attached pg.")
    res = con.execute("SELECT count(*) FROM pg.public.financial_records").fetchone()
    print(f"Row count: {res[0]}")
except Exception as e:
    print(f"Error: {e}")
