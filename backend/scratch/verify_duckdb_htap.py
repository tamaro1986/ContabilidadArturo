import sys
import os
from pathlib import Path

# Agregar el directorio raíz al path para importar 'app'
sys.path.append(str(Path(__file__).parent.parent))

from app.services.duckdb_client import get_duckdb_client
from app.core.config import settings

def main():
    print(f"--- HTAP CONNECTION VERIFICATION ---")
    print(f"DATABASE_URL: {settings.DATABASE_URL.split('@')[-1] if settings.DATABASE_URL else 'None'}")
    
    try:
        print("Intentando inicializar DuckDB con Secret Manager...")
        con = get_duckdb_client()
        print("¡ÉXITO! DuckDB se inicializó correctamente.")
        
        # Verificar que el catálogo pg está presente
        catalogs = con.execute("SELECT catalog_name FROM information_schema.schemata WHERE catalog_name = 'pg'").fetchall()
        if catalogs:
            print("Confirmado: Catálogo 'pg' adjuntado y visible.")
        else:
            print("ERROR: El catálogo 'pg' no se encuentra.")
            
    except Exception as e:
        print(f"FALLO CRÍTICO: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
