import duckdb
import logging
from urllib.parse import urlparse, unquote
from app.core.config import settings

logger = logging.getLogger(__name__)

# Conexión en memoria de DuckDB (instancia global compartida)
con = duckdb.connect(database=':memory:')
_initialized = False

# Variable global para el modo simulación
mock_con = None

def get_duckdb_client() -> duckdb.DuckDBPyConnection:
    """
    Retorna la conexión de DuckDB. En MOCK_MODE usa la instancia mock_con si está disponible.
    """
    if settings.MOCK_MODE and mock_con:
        return mock_con

    global _initialized
    if not _initialized:
        try:
            # 1. Instalar y cargar extensión
            con.execute("INSTALL postgres;")
            con.execute("LOAD postgres;")
            
            # 2. Parseo de URL (DATABASE_URL o DIRECT_URL)
            db_url = settings.DATABASE_URL or settings.DIRECT_URL
            parsed = urlparse(db_url)
            
            hostname = parsed.hostname
            port = parsed.port or 5432
            username = unquote(parsed.username) if parsed.username else "postgres"
            password = unquote(parsed.password) if parsed.password else ""
            
            logger.info(f"Iniciando conexión HTAP a {hostname}:{port}")

            # Intentar desvincular 'pg' si ya existe para evitar conflictos
            try:
                con.execute("DETACH pg")
            except Exception:
                pass
            
            # 3. Crear Secreto
            safe_password = password.replace("'", "''")
            con.execute(f"""
                CREATE OR REPLACE TEMPORARY SECRET supabase_pg (
                    TYPE POSTGRES,
                    HOST '{hostname}',
                    PORT {port},
                    DATABASE 'postgres',
                    USER '{username}',
                    PASSWORD '{safe_password}'
                );
            """)
            
            # 4. Adjuntar catálogo (Usar try-except por si acaso)
            try:
                con.execute("ATTACH '' AS pg (TYPE POSTGRES, SECRET supabase_pg);")
            except Exception as ae:
                if "already exists" in str(ae):
                    logger.info("El catálogo 'pg' ya estaba adjunto.")
                else:
                    raise ae
            
            # Verificación rápida
            con.execute("SELECT 1").fetchall()
                
            _initialized = True
            logger.info("DuckDB HTAP inicializado correctamente.")
        except Exception as e:
            logger.error(f"CRITICAL: Error en DuckDB: {str(e)}")
            raise RuntimeError(f"Fallo en motor analítico: {str(e)}")

    return con