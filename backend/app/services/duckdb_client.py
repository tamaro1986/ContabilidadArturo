import duckdb
import logging
from app.core.config import settings
from fastapi import Request

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
            # Instalar y cargar extensión para leer desde PostgreSQL
            con.execute("INSTALL postgres;")
            con.execute("LOAD postgres;")
            
            # Conectar DuckDB a PostgreSQL de forma vectorizada.
            # Se adjunta bajo el alias 'pg'
            con.execute(f"ATTACH '{settings.DATABASE_URL}' AS pg (TYPE POSTGRES);")
            _initialized = True
            logger.info("DuckDB embebido inicializado correctamente y conectado a PostgreSQL.")
        except Exception as e:
            logger.error(f"Error inicializando la conexión DuckDB a PostgreSQL: {e}")
            # En modo desarrollo local, no levantamos la excepción si no hay BD aún
    return con
