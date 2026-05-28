"""Script de diagnostico rapido para verificar la conexion DuckDB -> PostgreSQL"""
import os
import sys

# Cargar .env manualmente
from dotenv import load_dotenv
load_dotenv()

db_url = os.getenv("DATABASE_URL", "")
print(f"[1] DATABASE_URL encontrada: {'Si' if db_url else 'No'}")
print(f"    Primeros 40 chars: {db_url[:40]}...")

try:
    import duckdb
    print(f"\n[2] DuckDB version: {duckdb.__version__}")
    
    con = duckdb.connect(database=':memory:')
    
    print("[3] Instalando extension postgres...")
    con.execute("INSTALL postgres;")
    con.execute("LOAD postgres;")
    print("    OK - Extension postgres cargada")
    
    print(f"[4] Adjuntando base de datos remota...")
    from urllib.parse import urlparse, unquote
    parsed = urlparse(db_url)
    hostname = parsed.hostname
    port = parsed.port or 5432
    username = unquote(parsed.username) if parsed.username else "postgres"
    password = unquote(parsed.password) if parsed.password else ""
    
    con.execute(f"""
        CREATE OR REPLACE TEMPORARY SECRET supabase_pg (
            TYPE POSTGRES,
            HOST '{hostname}',
            PORT {port},
            DATABASE 'postgres',
            USER '{username}',
            PASSWORD '{password.replace("'", "''")}'
        );
    """)
    con.execute("ATTACH '' AS pg (TYPE POSTGRES, SECRET supabase_pg);")
    print("    OK - ATTACH exitoso")
    
    print("[5] Verificando catalogos disponibles...")
    catalogs = con.execute("SELECT catalog_name FROM information_schema.schemata GROUP BY 1").fetchall()
    catalog_names = [c[0] for c in catalogs]
    print(f"    Catalogos: {catalog_names}")
    
    print("[6] Verificando tablas en pg.public...")
    tables = con.execute("SELECT table_name FROM pg.information_schema.tables WHERE table_schema='public' LIMIT 10").fetchall()
    print(f"    Tablas encontradas: {[t[0] for t in tables]}")
    
    print("[7] Probando consulta a pg.public.financial_records...")
    count = con.execute("SELECT COUNT(*) FROM pg.public.financial_records").fetchone()
    print(f"    OK - Registros totales: {count[0]}")
    
    print("\n=== RESULTADO: CONEXION EXITOSA ===")
    
except Exception as e:
    print(f"\nX ERROR: {type(e).__name__}: {e}")
    sys.exit(1)
