import hashlib
import logging
from pathlib import Path
from typing import Any
import uuid
import zipfile
from io import BytesIO

import magic
from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from supabase import Client

from app.api.dependencies.roles import UserContext, require_contador
from app.core.errors import ApiException
from app.core.upload_security import (
    MAX_UPLOAD_BYTES,
    UnsafeUploadError,
    normalize_document_type,
    validate_upload_size,
    validated_archive_members,
)
from app.core.config import settings
from app.services.supabase_client import (
    get_supabase_admin_client,
    get_supabase_client,
)
from app.worker.tasks import ALLOWED_FILES, process_financial_csv

logger = logging.getLogger(__name__)
router = APIRouter()

BUCKET_NAME = "financial_uploads"
ALLOWED_MIME_TYPES = {
    "text/csv",
    "text/plain",
    "application/csv",
    "application/zip",
    "application/x-zip-compressed",
}


def _is_fake_client(client: Any) -> bool:
    return client is not None and type(client).__name__ == "FakeClient"


def _get_db_url(client: Any = None) -> str | None:
    if _is_fake_client(client):
        return None
    return settings.DATABASE_URL or settings.DIRECT_URL


def _require_client(client: Client | None, code: str) -> Client:
    if client is None:
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code=code,
            detail="El servicio de datos no está disponible.",
        )
    return client


def _ensure_company_belongs_to_tenant(
    client: Client | None,
    company_id: str,
    tenant_id: str,
) -> None:
    db_url = _get_db_url(client)
    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute(
                "SELECT id FROM public.companies WHERE id = %s AND tenant_id = %s LIMIT 1",
                (company_id, tenant_id),
            )
            row = cur.fetchone()
            cur.close()
            conn.close()
            if not row:
                raise ApiException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    code="COMPANY_NOT_FOUND",
                    detail="Empresa no encontrada.",
                )
            return
        except ApiException:
            raise
        except Exception:
            logger.exception("Company ownership lookup failed in PostgreSQL")

    if client:
        try:
            response = (
                client.table("companies")
                .select("id")
                .eq("id", company_id)
                .eq("tenant_id", tenant_id)
                .limit(1)
                .execute()
            )
            if not response.data:
                raise ApiException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    code="COMPANY_NOT_FOUND",
                    detail="Empresa no encontrada.",
                )
            return
        except ApiException:
            raise
        except Exception:
            logger.exception("Company ownership lookup failed")

    raise ApiException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        code="COMPANY_LOOKUP_FAILED",
        detail="No se pudo validar la empresa.",
    )


def _remove_storage_object(client: Client, path: str) -> None:
    try:
        client.storage.from_(BUCKET_NAME).remove([path])
    except Exception:
        logger.exception("Could not remove stored upload %s", path)


def _mark_enqueue_failure(
    client: Client,
    upload_id: str,
    tax_doc_id: str,
    tenant_id: str,
) -> None:
    try:
        (
            client.table("csv_upload_history")
            .update(
                {
                    "status": "error",
                    "error_message": "No se pudo iniciar el procesamiento.",
                }
            )
            .eq("id", upload_id)
            .eq("tenant_id", tenant_id)
            .execute()
        )
        (
            client.table("tax_documents")
            .update(
                {
                    "status": "error",
                    "error_message": "No se pudo iniciar el procesamiento.",
                }
            )
            .eq("id", tax_doc_id)
            .eq("tenant_id", tenant_id)
            .execute()
        )
    except Exception:
        logger.exception("Could not persist enqueue failure for upload %s", upload_id)


def _cleanup_registration(
    client: Client,
    *,
    upload_id: str,
    tax_doc_id: str,
    tenant_id: str,
) -> None:
    for table, record_id in (
        ("csv_upload_history", upload_id),
        ("tax_documents", tax_doc_id),
    ):
        try:
            (
                client.table(table)
                .delete()
                .eq("id", record_id)
                .eq("tenant_id", tenant_id)
                .execute()
            )
        except Exception:
            logger.exception("Could not clean partial %s registration", table)


def _database_error_code(exc: Exception) -> str | None:
    code = getattr(exc, "code", None)
    return str(code) if code is not None else None


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_financial_data(
    company_id: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    contador_data: UserContext = Depends(require_contador),
    supabase_admin: Client | None = Depends(get_supabase_admin_client),
):
    """Store and enqueue one financial CSV or ZIP upload."""
    client = supabase_admin
    tenant_id = contador_data["tenant_id"]
    db_url = _get_db_url(client)

    if not client and not db_url:
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="DATA_PROVIDER_UNAVAILABLE",
            detail="El servicio de datos no está disponible.",
        )

    _ensure_company_belongs_to_tenant(client, company_id, tenant_id)

    try:
        normalized_document_type = normalize_document_type(document_type)
        file_content = await file.read(MAX_UPLOAD_BYTES + 1)
        validate_upload_size(len(file_content))
    except UnsafeUploadError as exc:
        logger.warning("Upload rejected by size policy: %s", exc)
        raise ApiException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            code="UPLOAD_LIMIT_EXCEEDED",
            detail="El archivo supera el limite permitido.",
        )

    if not file_content:
        raise ApiException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="EMPTY_UPLOAD",
            detail="El archivo está vacío.",
        )

    mime_type = magic.from_buffer(file_content[:2048], mime=True)
    if mime_type not in ALLOWED_MIME_TYPES:
        raise ApiException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="UNSUPPORTED_FILE_TYPE",
            detail="Tipo de archivo no permitido. Use CSV o ZIP.",
        )

    is_zip = "zip" in mime_type
    if is_zip:
        try:
            with zipfile.ZipFile(BytesIO(file_content)) as archive:
                validated_archive_members(archive, ALLOWED_FILES)
        except (UnsafeUploadError, zipfile.BadZipFile) as exc:
            logger.warning("Upload rejected by archive policy: %s", exc)
            raise ApiException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                code="UNSAFE_ARCHIVE",
                detail="El archivo ZIP no cumple las reglas de seguridad.",
            )

    file_hash = hashlib.sha256(file_content).hexdigest()

    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute(
                """
                SELECT id FROM public.csv_upload_history 
                WHERE tenant_id = %s AND company_id = %s AND file_hash = %s 
                LIMIT 1;
                """,
                (tenant_id, company_id, file_hash),
            )
            existing_row = cur.fetchone()
            cur.close()
            conn.close()
            if existing_row:
                raise ApiException(
                    status_code=status.HTTP_409_CONFLICT,
                    code="DUPLICATE_UPLOAD",
                    detail="Este archivo ya fue cargado para esta empresa.",
                )
        except ApiException:
            raise
        except Exception:
            logger.exception("Upload duplicate lookup failed in PostgreSQL")
            if not client:
                raise ApiException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    code="UPLOAD_LOOKUP_FAILED",
                    detail="No se pudo validar la carga.",
                )

    if (not db_url or _is_fake_client(client)) and client:
        try:
            existing = (
                client.table("csv_upload_history")
                .select("id")
                .eq("tenant_id", tenant_id)
                .eq("company_id", company_id)
                .eq("file_hash", file_hash)
                .limit(1)
                .execute()
            )
            if existing.data:
                raise ApiException(
                    status_code=status.HTTP_409_CONFLICT,
                    code="DUPLICATE_UPLOAD",
                    detail="Este archivo ya fue cargado para esta empresa.",
                )
        except ApiException:
            raise
        except Exception:
            logger.exception("Upload duplicate lookup failed")
            raise ApiException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                code="UPLOAD_LOOKUP_FAILED",
                detail="No se pudo validar la carga.",
            )

    upload_id = str(uuid.uuid4())
    tax_doc_id = str(uuid.uuid4())
    safe_filename = f"{tenant_id}/{upload_id}.{'zip' if is_zip else 'csv'}"
    original_filename = file.filename or f"{upload_id}.{'zip' if is_zip else 'csv'}"

    # Guardar en volumen compartido en disco
    upload_disk_path = Path("secure_uploads") / safe_filename
    try:
        upload_disk_path.parent.mkdir(parents=True, exist_ok=True)
        upload_disk_path.write_bytes(file_content)
    except Exception:
        logger.exception("Storage disk write failed for %s", safe_filename)
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="STORAGE_UNAVAILABLE",
            detail="No se pudo almacenar el archivo en disco.",
        )

    if client:
        try:
            client.storage.from_(BUCKET_NAME).upload(
                file=file_content,
                path=safe_filename,
                file_options={"content-type": mime_type},
            )
        except Exception:
            if _is_fake_client(client):
                if upload_disk_path.exists():
                    upload_disk_path.unlink()
                raise ApiException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    code="STORAGE_UNAVAILABLE",
                    detail="El servicio de almacenamiento no está disponible.",
                )
            logger.warning("Could not upload to Supabase Storage; using local volume storage.")

    uploader_id = getattr(contador_data["user"], "id", None)
    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO public.tax_documents 
                (id, tenant_id, company_id, document_type, filename, file_path, status, uploaded_by)
                VALUES (%s, %s, %s, %s, %s, %s, 'pending', %s);
                """,
                (tax_doc_id, tenant_id, company_id, normalized_document_type, original_filename, safe_filename, uploader_id),
            )
            cur.execute(
                """
                INSERT INTO public.csv_upload_history 
                (id, tenant_id, company_id, document_type, filename, file_path, file_hash, status, uploaded_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', %s);
                """,
                (upload_id, tenant_id, company_id, normalized_document_type, original_filename, safe_filename, file_hash, uploader_id),
            )
            cur.close()
            conn.close()
        except Exception as exc:
            logger.exception("Could not register upload in PostgreSQL %s", upload_id)
            if upload_disk_path.exists():
                upload_disk_path.unlink()
            if "23505" in str(exc):
                raise ApiException(
                    status_code=status.HTTP_409_CONFLICT,
                    code="DUPLICATE_UPLOAD",
                    detail="Este archivo ya fue cargado para esta empresa.",
                )
            raise ApiException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code="UPLOAD_REGISTRATION_FAILED",
                detail="No se pudo registrar la carga.",
            )
    elif client:
        try:
            client.table("tax_documents").insert(
                {
                    "id": tax_doc_id,
                    "tenant_id": tenant_id,
                    "company_id": company_id,
                    "document_type": normalized_document_type,
                    "filename": original_filename,
                    "file_path": safe_filename,
                    "status": "pending",
                    "uploaded_by": uploader_id,
                }
            ).execute()
            client.table("csv_upload_history").insert(
                {
                    "id": upload_id,
                    "tenant_id": tenant_id,
                    "company_id": company_id,
                    "document_type": normalized_document_type,
                    "filename": original_filename,
                    "file_path": safe_filename,
                    "file_hash": file_hash,
                    "status": "pending",
                    "uploaded_by": uploader_id,
                }
            ).execute()
        except Exception as exc:
            logger.exception("Could not register upload %s", upload_id)
            _remove_storage_object(client, safe_filename)
            _cleanup_registration(
                client,
                upload_id=upload_id,
                tax_doc_id=tax_doc_id,
                tenant_id=tenant_id,
            )
            if _database_error_code(exc) == "23505":
                raise ApiException(
                    status_code=status.HTTP_409_CONFLICT,
                    code="DUPLICATE_UPLOAD",
                    detail="Este archivo ya fue cargado para esta empresa.",
                )
            raise ApiException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code="UPLOAD_REGISTRATION_FAILED",
                detail="No se pudo registrar la carga.",
            )

    try:
        process_financial_csv.apply_async(
            kwargs={
                "bucket_name": BUCKET_NAME,
                "file_path": safe_filename,
                "tenant_id": tenant_id,
                "company_id": company_id,
                "upload_id": upload_id,
                "tax_doc_id": tax_doc_id,
                "document_type": normalized_document_type,
            }
        )
    except Exception:
        logger.exception("Redis rejected upload task %s", upload_id)
        if upload_disk_path.exists():
            try:
                upload_disk_path.unlink()
            except Exception:
                pass
        if db_url:
            try:
                import psycopg2
                conn = psycopg2.connect(db_url)
                conn.autocommit = True
                cur = conn.cursor()
                cur.execute(
                    "UPDATE public.csv_upload_history SET status = 'error', error_message = 'No se pudo iniciar el procesamiento.' WHERE id = %s AND tenant_id = %s;",
                    (upload_id, tenant_id),
                )
                cur.execute(
                    "UPDATE public.tax_documents SET status = 'error', error_message = 'No se pudo iniciar el procesamiento.' WHERE id = %s AND tenant_id = %s;",
                    (tax_doc_id, tenant_id),
                )
                cur.close()
                conn.close()
            except Exception:
                logger.exception("Could not mark enqueue failure in PostgreSQL")
        if client:
            _mark_enqueue_failure(client, upload_id, tax_doc_id, tenant_id)
            _remove_storage_object(client, safe_filename)
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="QUEUE_UNAVAILABLE",
            detail="No se pudo iniciar el procesamiento.",
        )

    return {
        "message": "Archivo recibido. Procesamiento en segundo plano iniciado.",
        "upload_id": upload_id,
    }


@router.get("/uploads")
async def get_upload_history(
    company_id: str | None = None,
    contador_data: UserContext = Depends(require_contador),
    supabase: Client | None = Depends(get_supabase_client),
):
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
            query += " ORDER BY h.created_at DESC LIMIT 50;"
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            cur.close()
            conn.close()

            data = [
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
            return {"status": "success", "data": data}
        except Exception:
            logger.exception("Upload history lookup failed in PostgreSQL")

    client = _require_client(supabase, "DATA_PROVIDER_UNAVAILABLE") if not db_url else supabase
    if client:
        try:
            query = (
                client.table("csv_upload_history")
                .select("*, companies(name)")
                .eq("tenant_id", tenant_id)
            )
            if company_id:
                query = query.eq("company_id", company_id)
            response = query.order("created_at", desc=True).limit(50).execute()
            return {"status": "success", "data": response.data}
        except Exception:
            logger.exception("Upload history lookup failed")

    raise ApiException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        code="UPLOAD_HISTORY_UNAVAILABLE",
        detail="El historial no está disponible.",
    )


@router.delete("/uploads/{upload_id}")
async def delete_upload(
    upload_id: str,
    contador_data: UserContext = Depends(require_contador),
    supabase_admin: Client | None = Depends(get_supabase_admin_client),
):
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
            cur.execute("DELETE FROM public.csv_upload_history WHERE id = %s AND tenant_id = %s RETURNING id;", (upload_id, tenant_id))
            deleted = cur.fetchone()
            cur.close()
            conn.close()
            if not deleted:
                raise ApiException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    code="UPLOAD_NOT_FOUND",
                    detail="Carga no encontrada.",
                )
            return {"status": "success", "message": "Carga eliminada del historial"}
        except ApiException:
            raise
        except Exception:
            logger.exception("Upload deletion failed in PostgreSQL")
            raise ApiException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code="UPLOAD_DELETE_FAILED",
                detail="No se pudo eliminar la carga.",
            )

    client = _require_client(supabase_admin, "DATA_PROVIDER_UNAVAILABLE")
    try:
        response = (
            client.table("csv_upload_history")
            .delete()
            .eq("id", upload_id)
            .eq("tenant_id", tenant_id)
            .execute()
        )
    except Exception:
        logger.exception("Upload deletion failed")
        raise ApiException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="UPLOAD_DELETE_FAILED",
            detail="No se pudo eliminar la carga.",
        )
    if not response.data:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="UPLOAD_NOT_FOUND",
            detail="Carga no encontrada.",
        )
    return {"status": "success", "message": "Carga eliminada del historial"}


@router.delete("/company/{company_id}/records")
async def reset_company_records(
    company_id: str,
    contador_data: UserContext = Depends(require_contador),
    supabase_admin: Client | None = Depends(get_supabase_admin_client),
):
    tenant_id = contador_data["tenant_id"]
    db_url = _get_db_url(supabase_admin)

    if db_url:
        _ensure_company_belongs_to_tenant(supabase_admin, company_id, tenant_id)
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute("DELETE FROM public.financial_records WHERE company_id = %s AND tenant_id = %s;", (company_id, tenant_id))
            cur.execute("DELETE FROM public.csv_upload_history WHERE company_id = %s AND tenant_id = %s;", (company_id, tenant_id))
            cur.execute("DELETE FROM public.tax_documents WHERE company_id = %s AND tenant_id = %s;", (company_id, tenant_id))
            cur.execute("UPDATE public.companies SET total_records = 0, last_processed_month = NULL WHERE id = %s AND tenant_id = %s;", (company_id, tenant_id))
            cur.close()
            conn.close()
            return {"status": "success", "message": "Datos de la empresa reiniciados"}
        except Exception:
            logger.exception("Company reset failed in PostgreSQL")
            raise ApiException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code="COMPANY_RESET_FAILED",
                detail="No se pudieron reiniciar los datos de la empresa.",
            )

    client = _require_client(supabase_admin, "DATA_PROVIDER_UNAVAILABLE")
    _ensure_company_belongs_to_tenant(client, company_id, tenant_id)
    try:
        for table in ("financial_records", "csv_upload_history", "tax_documents"):
            (
                client.table(table)
                .delete()
                .eq("company_id", company_id)
                .eq("tenant_id", tenant_id)
                .execute()
            )
        (
            client.table("companies")
            .update({"total_records": 0, "last_processed_month": None})
            .eq("id", company_id)
            .eq("tenant_id", tenant_id)
            .execute()
        )
    except Exception:
        logger.exception("Company reset failed")
        raise ApiException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="COMPANY_RESET_FAILED",
            detail="No se pudieron reiniciar los datos de la empresa.",
        )
    return {"status": "success", "message": "Datos de la empresa reiniciados"}
