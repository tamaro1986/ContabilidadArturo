import duckdb
import os
import sys
from dotenv import load_dotenv

# Asegurar que el path del backend esté en sys.path para importar settings
sys.path.append(os.getcwd())

from app.core.config import settings

def test_duckdb():
    print(f"Project: {settings.PROJECT_NAME}")
    db_url = settings.DATABASE_URL
    print(f"Connecting to Postgres (masked): {db_url[:20]}...")
    
    con = duckdb.connect(database=':memory:')
    
    try:
        con.execute("INSTALL postgres;")
        con.execute("LOAD postgres;")
        
        # Intentar adjuntar
        print(f"Attaching {db_url[:20]} as 'pg'...")
        con.execute(f"ATTACH '{db_url}' AS pg (TYPE POSTGRES);")
        
        # 1. Listar catálogos
        print("\n--- Catalogs ---")
        catalogs = con.execute("SELECT catalog_name FROM information_schema.schemata GROUP BY 1").fetchall()
        print(catalogs)
        
        # 2. Listar esquemas en pg
        print("\n--- Schemas in 'pg' ---")
        schemas = con.execute("SELECT schema_name FROM information_schema.schemata WHERE catalog_name = 'pg'").fetchall()
        print(schemas)
        
        # 3. Listar tablas en pg.public
        print("\n--- Tables in 'pg.public' ---")
        tables = con.execute("SELECT table_name FROM information_schema.tables WHERE table_catalog = 'pg' AND table_schema = 'public'").fetchall()
        print(tables)
        
        # 4. Probar consulta con ruta completa
        print("\n--- Testing pg.public.financial_records ---")
        try:
            res = con.execute("SELECT count(*) FROM pg.public.financial_records").fetchone()
            print(f"SUCCESS! Row count: {res[0]}")
        except Exception as e:
            print(f"FAILED with pg.public: {e}")
            
        # 5. Probar consulta con ruta corta (fallará si no está en search_path)
        print("\n--- Testing pg.financial_records (should likely fail) ---")
        try:
            res = con.execute("SELECT count(*) FROM pg.financial_records").fetchone()
            print(f"SUCCESS! Row count: {res[0]}")
        except Exception as e:
            print(f"EXPECTED FAILURE with pg.financial_records: {e}")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    test_duckdb()
