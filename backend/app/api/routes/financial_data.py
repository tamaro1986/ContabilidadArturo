import hashlib
import logging
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


def _require_client(client: Client | None, code: str) -> Client:
    if client is None:
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code=code,
            detail="El servicio de datos no está disponible.",
        )
    return client


def _ensure_company_belongs_to_tenant(
    client: Client,
    company_id: str,
    tenant_id: str,
) -> None:
    try:
        response = (
            client.table("companies")
            .select("id")
            .eq("id", company_id)
            .eq("tenant_id", tenant_id)
            .limit(1)
            .execute()
        )
    except Exception:
        logger.exception("Company ownership lookup failed")
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="COMPANY_LOOKUP_FAILED",
            detail="No se pudo validar la empresa.",
        )
    if not response.data:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="COMPANY_NOT_FOUND",
            detail="Empresa no encontrada.",
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
    client = _require_client(supabase_admin, "DATA_PROVIDER_UNAVAILABLE")
    tenant_id = contador_data["tenant_id"]
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
    except Exception:
        logger.exception("Upload duplicate lookup failed")
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="UPLOAD_LOOKUP_FAILED",
            detail="No se pudo validar la carga.",
        )
    if existing.data:
        raise ApiException(
            status_code=status.HTTP_409_CONFLICT,
            code="DUPLICATE_UPLOAD",
            detail="Este archivo ya fue cargado para esta empresa.",
        )

    upload_id = str(uuid.uuid4())
    tax_doc_id = str(uuid.uuid4())
    safe_filename = f"{tenant_id}/{upload_id}.{'zip' if is_zip else 'csv'}"
    original_filename = file.filename or f"{upload_id}.{'zip' if is_zip else 'csv'}"

    try:
        client.storage.from_(BUCKET_NAME).upload(
            file=file_content,
            path=safe_filename,
            file_options={"content-type": mime_type},
        )
    except Exception:
        logger.exception("Storage upload failed for %s", safe_filename)
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="STORAGE_UNAVAILABLE",
            detail="No se pudo almacenar el archivo.",
        )

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
                "uploaded_by": getattr(contador_data["user"], "id", None),
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
                "uploaded_by": getattr(contador_data["user"], "id", None),
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
    client = _require_client(supabase, "DATA_PROVIDER_UNAVAILABLE")
    try:
        query = (
            client.table("csv_upload_history")
            .select("*, companies(name)")
            .eq("tenant_id", contador_data["tenant_id"])
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
    client = _require_client(supabase_admin, "DATA_PROVIDER_UNAVAILABLE")
    try:
        response = (
            client.table("csv_upload_history")
            .delete()
            .eq("id", upload_id)
            .eq("tenant_id", contador_data["tenant_id"])
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
    client = _require_client(supabase_admin, "DATA_PROVIDER_UNAVAILABLE")
    tenant_id = contador_data["tenant_id"]
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
