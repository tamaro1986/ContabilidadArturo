"""Probar multiples combinaciones de connection string"""
import psycopg2

project_ref = "hujxihigwjjapiuapefd"
password = "Sofia2020$125"

# Lista de combinaciones a probar
tests = [
    {
        "name": "Pooler Session (5432) - user con project ref",
        "dsn": f"host=aws-0-us-east-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.{project_ref} password={password}"
    },
    {
        "name": "Pooler Transaction (6543) - user con project ref",
        "dsn": f"host=aws-0-us-east-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.{project_ref} password={password}"
    },
    {
        "name": "Pooler Session (5432) - user simple",
        "dsn": f"host=aws-0-us-east-1.pooler.supabase.com port=5432 dbname=postgres user=postgres password={password}"
    },
    {
        "name": "Pooler Transaction (6543) - user simple",  
        "dsn": f"host=aws-0-us-east-1.pooler.supabase.com port=6543 dbname=postgres user=postgres password={password}"
    },
]

for i, test in enumerate(tests, 1):
    print(f"\n[{i}] {test['name']}...")
    try:
        conn = psycopg2.connect(test['dsn'], connect_timeout=10)
        cur = conn.cursor()
        cur.execute("SELECT current_user, current_database()")
        user, db = cur.fetchone()
        print(f"    OK! User={user}, DB={db}")
        cur.close()
        conn.close()
    except Exception as e:
        msg = str(e).strip().split('\n')[0]
        print(f"    FALLO: {msg}")
