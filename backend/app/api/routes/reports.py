import uuid
import logging
import duckdb
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.api.dependencies.roles import require_contador

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/libro-iva", status_code=status.HTTP_200_OK)
async def generate_libro_iva(
    file_id: str = Query(..., description="UUID del archivo de anexo tributario sanitizado"),
    current_user: dict = Depends(require_contador)
):
    # 1. Validar que file_id sea un UUID válido (previene path traversal)
    try:
        uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de archivo inválido. Debe ser un UUID."
        )

    # 2. Resolver la ruta física del archivo sanitizado
    file_path = None
    possible_paths = [
        Path("secure_uploads") / f"anexo_{file_id}.csv",
        Path("temp_uploads") / f"{file_id}.csv",
        Path("secure_uploads") / file_id
    ]

    for path in possible_paths:
        try:
            resolved = path.resolve()
            # Verificar que el path resuelto esté dentro de los directorios permitidos
            allowed_dirs = [
                Path("secure_uploads").resolve(),
                Path("temp_uploads").resolve()
            ]
            if any(str(resolved).startswith(str(d)) for d in allowed_dirs) and resolved.exists() and resolved.is_file():
                file_path = resolved
                break
        except (ValueError, OSError, RuntimeError):
            continue

    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Archivo de anexo no encontrado en el servidor."
        )

    con = None
    try:
        # 3. Conectar a DuckDB en memoria de manera aislada
        con = duckdb.connect(':memory:')

        # 4. Consulta SQL Vectorizada de Alto Rendimiento
        query = """
            SELECT 
                COALESCE(SUM(TRY_CAST(c9 AS DOUBLE)), 0) as total_ventas_exentas,
                COALESCE(SUM(TRY_CAST(c10 AS DOUBLE)), 0) as total_ventas_no_sujetas,
                COALESCE(SUM(TRY_CAST(c11 AS DOUBLE)), 0) as total_ventas_gravadas,
                COALESCE(SUM(TRY_CAST(c12 AS DOUBLE)), 0) as total_debito_fiscal,
                COALESCE(SUM(TRY_CAST(c15 AS DOUBLE)), 0) as total_general
            FROM read_csv_auto(?,
                header=false,
                names=['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15', 'c16', 'c17', 'c18', 'c19']
            )
        """
        
        result = con.execute(query, [file_path.as_posix()]).fetchone()
        
        response_data = {
            "ventas_exentas": result[0],
            "ventas_no_sujetas": result[1],
            "ventas_gravadas_locales": result[2],
            "debito_fiscal": result[3],
            "total_ventas": result[4],
        }

        return {
            "status": "success",
            "file_id": file_id,
            "message": "Libro de IVA procesado con éxito.",
            "data": response_data
        }

    except Exception as e:
        logger.error("Error procesando DuckDB para Libro IVA (Archivo: %s): %s", file_path, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el motor analítico de procesamiento: {str(e)}"
        )
    finally:
        if con is not None:
            try:
                con.close()
            except Exception as close_err:
                logger.error("Error cerrando conexión a DuckDB: %s", close_err)
        
        try:
            if file_path and file_path.exists():
                file_path.unlink()
        except Exception as cleanup_err:
            logger.warning("No se pudo eliminar el archivo temporal %s: %s", file_path, cleanup_err)
