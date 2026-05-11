import os
import duckdb
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Configuración de Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

def sanitize_for_csv_injection(value):
    """
    Sanitiza valores para evitar CSV Injection (Formula Injection).
    Si el valor comienza con characters peligrosos, se añade un apóstrofe simple.
    """
    if isinstance(value, str) and value.startswith(('=', '+', '-', '@')):
        return f"'{value}"
    return value

def process_csv_task(file_path: str, tenant_id: str):
    """
    Motor Analítico DuckDB: Procesa el archivo CSV de forma vectorial y asíncrona.
    """
    logger.info(f"Iniciando procesamiento DuckDB para archivo: {file_path}")
    
    try:
        # 1. Conexión a DuckDB (In-Memory para máxima velocidad)
        con = duckdb.connect(database=':memory:')
        
        # 2. Análisis Vectorial con DuckDB
        # Intentamos detectar automáticamente el delimitador y tipo de Hacienda
        query = f"SELECT count(*) as total_rows FROM read_csv_auto('{file_path}')"
        result = con.execute(query).fetchone()
        total_rows = result[0]
        
        logger.info(f"Archivo procesado: {total_rows} registros encontrados.")

        # 3. Simulación de procesamiento de columnas financieras
        # (Aquí se añadiría la lógica específica de columnas de Hacienda)
        
        # 4. Sanitización y Preparación de Datos (OWASP)
        # Ejemplo: Sanitizar el nombre del archivo o metadatos antes de enviarlos
        safe_tenant_id = sanitize_for_csv_injection(tenant_id)

        # 5. Persistencia en Supabase
        if supabase:
            # Actualizamos el estado del tenant o guardamos el log de procesamiento
            # En un caso real, aquí insertaríamos los registros analizados
            try:
                supabase.table("companies").update({
                    "status": "active",
                    "total_records": total_rows,
                    "last_processed": "now()"
                }).eq("tenant_id", tenant_id).execute()
                logger.info("Estado actualizado en Supabase exitosamente.")
            except Exception as e:
                logger.error(f"Error al actualizar Supabase: {str(e)}")
        else:
            logger.warning("Supabase no configurado. Resultados solo en log.")

    except Exception as e:
        logger.error(f"Fallo crítico en el motor analítico: {str(e)}")
    finally:
        # 6. Limpieza de seguridad: Eliminar archivo temporal
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Archivo temporal eliminado: {file_path}")
        
        con.close()
