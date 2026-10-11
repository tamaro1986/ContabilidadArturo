import logging
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.core.config import settings
from app.services.supabase_client import get_supabase_client, get_supabase_admin_client
from app.api.dependencies.roles import require_contador

logger = logging.getLogger(__name__)
router = APIRouter()


def _is_fake_client(client: Any) -> bool:
    return client is not None and type(client).__name__ == "FakeClient"


def _get_db_url(client: Any = None) -> str | None:
    if _is_fake_client(client):
        return None
    return settings.DATABASE_URL or settings.DIRECT_URL


@router.delete("/{upload_id}", status_code=200)
async def delete_upload_history(
    upload_id: str,
    contador_data: dict = Depends(require_contador),
    supabase_admin: Client | None = Depends(get_supabase_admin_client),
):
    """
    Elimina un registro de carga y todos los datos financieros asociados a ese upload_id.
    """
    tenant_id = contador_data["tenant_id"]
    db_url = _get_db_url(supabase_admin)

    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute("DELETE FROM public.financial_records WHERE upload_id = %s AND tenant_id = %s;", (upload_id, tenant_id))
            cur.execute("DELETE FROM public.tax_documents WHERE id = %s AND tenant_id = %s;", (upload_id, tenant_id))
            cur.execute("DELETE FROM public.csv_upload_history WHERE id = %s AND tenant_id = %s;", (upload_id, tenant_id))
            cur.close()
            conn.close()
            return {"status": "success", "message": "Carga y registros asociados eliminados."}
        except Exception as e:
            logger.exception("Error deleting upload in PostgreSQL")
            raise HTTPException(status_code=500, detail=f"Error al eliminar carga: {str(e)}")

    if supabase_admin:
        try:
            supabase_admin.table("financial_records")\
                .delete()\
                .eq("upload_id", upload_id)\
                .eq("tenant_id", tenant_id)\
                .execute()
            
            supabase_admin.table("csv_upload_history")\
                .delete()\
                .eq("id", upload_id)\
                .eq("tenant_id", tenant_id)\
                .execute()

            return {"status": "success", "message": "Carga y registros asociados eliminados."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al eliminar carga: {str(e)}")

    raise HTTPException(status_code=503, detail="Servicio de base de datos no disponible.")


@router.get("/history")
async def get_detailed_upload_history(
    company_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    contador_data: dict = Depends(require_contador),
    supabase: Client | None = Depends(get_supabase_client),
):
    """
    Retorna el historial detallado de cargas CSV con trazabilidad de procesamiento.
    Soporta paginación y filtrado por empresa.
    """
    tenant_id = contador_data["tenant_id"]
    db_url = _get_db_url(supabase)

    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()

            query = """
                SELECT 
                    h.id, h.tenant_id, h.company_id, h.document_type, h.uploaded_by,
                    h.filename, h.file_path, h.file_hash, h.status, h.records_processed,
                    h.error_message, h.created_at,
                    c.name as company_name
                FROM public.csv_upload_history h
                LEFT JOIN public.companies c ON h.company_id = c.id
                WHERE h.tenant_id = %s
            """
            params: list[Any] = [tenant_id]
            if company_id:
                query += " AND h.company_id = %s"
                params.append(company_id)

            query += " ORDER BY h.created_at DESC LIMIT %s OFFSET %s;"
            start = (page - 1) * page_size
            params.extend([page_size, start])

            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            cur.close()
            conn.close()

            items = [
                {
                    "id": str(r[0]),
                    "tenant_id": str(r[1]),
                    "company_id": str(r[2]),
                    "document_type": r[3],
                    "uploaded_by": str(r[4]) if r[4] else None,
                    "filename": r[5],
                    "file_path": r[6],
                    "file_hash": r[7],
                    "status": r[8],
                    "records_processed": r[9] or 0,
                    "error_message": r[10],
                    "created_at": r[11].isoformat() if hasattr(r[11], "isoformat") else str(r[11]),
                    "companies": {"name": r[12]} if r[12] else None,
                }
                for r in rows
            ]

            return {
                "status": "success",
                "data": items,
                "metadata": {
                    "page": page,
                    "page_size": page_size,
                    "count": len(items),
                },
            }
        except Exception as e:
            logger.exception("Error querying upload history in PostgreSQL")
            raise HTTPException(
                status_code=400,
                detail=f"Error al obtener trazabilidad de cargas: {str(e)}",
            )

    if supabase:
        try:
            query = supabase.table("csv_upload_history")\
                .select("*, companies(name)")\
                .eq("tenant_id", tenant_id)

            if company_id:
                query = query.eq("company_id", company_id)

            start = (page - 1) * page_size
            end = start + page_size - 1

            res = query.order("created_at", desc=True)\
                .range(start, end)\
                .execute()

            return {
                "status": "success",
                "data": res.data or [],
                "metadata": {
                    "page": page,
                    "page_size": page_size,
                    "count": len(res.data or []),
                },
            }
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error al obtener trazabilidad de cargas: {str(e)}",
            )

    return {
        "status": "success",
        "data": [],
        "metadata": {
            "page": page,
            "page_size": page_size,
            "count": 0,
        },
    }


@router.get("/status/{upload_id}")
async def get_upload_status(
    upload_id: str,
    contador_data: dict = Depends(require_contador),
    supabase: Client | None = Depends(get_supabase_client),
):
    """
    Endpoint rápido para polling del estado de un upload específico.
    """
    tenant_id = contador_data["tenant_id"]
    db_url = _get_db_url(supabase)

    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute(
                """
                SELECT id, status, records_processed, error_message
                FROM public.csv_upload_history
                WHERE id = %s AND tenant_id = %s
                LIMIT 1;
                """,
                (upload_id, tenant_id),
            )
            row = cur.fetchone()
            cur.close()
            conn.close()

            if not row:
                raise HTTPException(status_code=404, detail="Registro de carga no encontrado")

            return {
                "status": "success",
                "data": {
                    "id": str(row[0]),
                    "status": row[1],
                    "records_processed": row[2] or 0,
                    "error_message": row[3],
                },
            }
        except HTTPException:
            raise
        except Exception:
            logger.exception("Error polling upload status in PostgreSQL")
            raise HTTPException(status_code=404, detail="Registro de carga no encontrado")

    if supabase:
        try:
            res = supabase.table("csv_upload_history")\
                .select("id, status, records_processed, error_message")\
                .eq("id", upload_id)\
                .eq("tenant_id", tenant_id)\
                .single()\
                .execute()

            return {"status": "success", "data": res.data}
        except Exception:
            raise HTTPException(status_code=404, detail="Registro de carga no encontrado")

    raise HTTPException(status_code=404, detail="Registro de carga no encontrado")
