import csv
import io
import logging
from pathlib import Path
import re
import uuid
import zipfile
from datetime import date, datetime
from typing import Any, Iterator

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.upload_security import validated_archive_members
from app.services.cache import invalidate_tenant_cache
from app.services.supabase_client import get_supabase_admin_client

logger = logging.getLogger(__name__)

IVA_RATE = 0.13
INSERT_BATCH_SIZE = 500
ALLOWED_FILES = {
    "F07_ANEXO_CONTRIBUYENTES.csv",
    "F07_ANEXO_CONSUMIDOR_FINAL.csv",
    "F07_ANEXO_COMPRAS.csv",
    "F07_CASILLA_66.csv",
    "F07_DETALLE_DOCUMENTOS.csv",
    "F14_ANEXO_RENTA.csv",
    "F14_ANEXO_Q25.csv",
}

_LIBRO_HEADERS = {
    "CONTRIBUYENTE": (
        "FECHA_EMISION,CLASE_DOC,TIPO_DOC,NUM_RESOLUCION,SERIE,NUM_DOC,"
        "NUM_CONTROL,NIT_CLIENTE,NOMBRE_CLIENTE,VENTAS_EXENTAS,"
        "VENTAS_NO_SUJETAS,VENTAS_GRAVADAS,DEBITO_FISCAL,VENTAS_TERCEROS,"
        "DEBITO_TERCEROS,TOTAL_VENTA,DUI_CLIENTE,TIPO_OPERACION,"
        "TIPO_INGRESO,NUM_ANEXO"
    ),
    "CONSUMIDOR": (
        "FECHA_EMISION,CLASE_DOC,TIPO_DOC,NUM_RESOLUCION,SERIE,"
        "NUM_CONTROL_DESDE,NUM_CONTROL_HASTA,NUM_DOC_DESDE,NUM_DOC_HASTA,"
        "NUM_MAQUINA,VENTAS_EXENTAS,VENTAS_INTERNAS_EXENTAS,"
        "VENTAS_NO_SUJETAS,VENTAS_GRAVADAS,EXPORTACIONES_CENTROAMERICA,"
        "EXPORTACIONES_FUERA_CENTROAMERICA,EXPORTACIONES_SERVICIO,"
        "VENTAS_ZONAS_FRANCAS,VENTAS_TERCEROS,TOTAL_VENTAS,TIPO_OPERACION,"
        "TIPO_INGRESO,NUM_ANEXO"
    ),
    "COMPRAS": (
        "FECHA_EMISION,CLASE_DOC,TIPO_DOC,NUM_DOC,NIT_PROVEEDOR,"
        "NOMBRE_PROVEEDOR,COMPRAS_INTERNAS_EXENTAS,INTERNACIONES_EXENTAS,"
        "IMPORTACIONES_EXENTAS,COMPRAS_INTERNAS_GRAVADAS,"
        "INTERNACIONES_GRAVADAS,IMPORTACIONES_GRAVADAS_BIENES,"
        "IMPORTACIONES_GRAVADAS_SERVICIOS,CREDITO_FISCAL,TOTAL_COMPRAS,"
        "DUI_PROVEEDOR,TIPO_OPERACION,CLASIFICACION,SECTOR,"
        "TIPO_COSTO_GASTO,NUM_ANEXO"
    ),
}


def _is_fake_client(client: Any) -> bool:
    return client is not None and type(client).__name__ == "FakeClient"


def _get_db_url(client: Any = None) -> str | None:
    if _is_fake_client(client):
        return None
    return settings.DATABASE_URL or settings.DIRECT_URL


def _sanitize_cell(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).replace("\x00", "").strip()
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text
    return text


def _parse_date(raw: str) -> date:
    raw = (raw or "").strip()
    for fmt in ("%d/%m/%Y", "%m/%Y", "%Y-%m-%d"):
        try:
            parsed = datetime.strptime(raw, fmt).date()
            return parsed.replace(day=1) if fmt == "%m/%Y" else parsed
        except ValueError:
            continue
    match = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", raw)
    if match:
        return date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
    if len(raw) == 6 and raw.isdigit():
        try:
            return datetime.strptime(raw, "%m%Y").date().replace(day=1)
        except ValueError:
            pass
    return date.today()


def _parse_decimal(raw: str) -> float:
    if not raw:
        return 0.0
    cleaned = re.sub(r"[^\d.\-]", "", raw.strip())
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _norm_tipo_doc(raw: str) -> str:
    match = re.match(r"^0*(\d+)", raw.strip())
    return match.group(0).zfill(2) if match else (raw[:2] if raw else "00")


def _safe_decode(content_bytes: bytes) -> str:
    for encoding in ("utf-8-sig", "latin-1", "cp1252", "utf-8"):
        try:
            return content_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content_bytes.decode("utf-8", errors="replace")


def _detect_separator(sample: str) -> str:
    counts = {sep: sample.count(sep) for sep in (",", ";", "\t", "|")}
    best = max(counts, key=counts.get)
    return best if counts[best] > 0 else ","


def _classify_filename(filename: str, document_type: str | None = None) -> str | None:
    combined = f"{filename} {document_type or ''}".upper()
    if "CONTRIBUYENTE" in combined or "F07_ANEXO_CONTRIBUYENTES" in combined:
        return "CONTRIBUYENTE"
    if "CONSUMIDOR" in combined or "F07_ANEXO_CONSUMIDOR_FINAL" in combined:
        return "CONSUMIDOR"
    if "COMPRAS" in combined or "F07_ANEXO_COMPRAS" in combined:
        return "COMPRAS"
    return None


def _ensure_headers(
    content: str, filename: str, document_type: str | None
) -> tuple[str, str]:
    first_line = content.split("\n", 1)[0]
    separator = _detect_separator(first_line)
    category = _classify_filename(filename, document_type)
    if not category:
        return content, separator

    expected_cols = [c.strip() for c in _LIBRO_HEADERS[category].split(",")]
    tokens = [t.strip().strip('"').upper() for t in first_line.split(separator)]

    matches = sum(1 for token in tokens if any(token in col for col in expected_cols))
    if matches < 3:
        header = (
            _LIBRO_HEADERS[category]
            if separator == ","
            else _LIBRO_HEADERS[category].replace(",", separator)
        )
        return f"{header}\n{content}", separator
    return content, separator


def _first_key(row: dict[str, str], *tokens: str) -> str:
    for key in row:
        upper = key.upper()
        if all(token in upper for token in tokens):
            return key
    return ""


def _first_value(row: dict[str, str], token: str, default: str = "") -> str:
    for key, value in row.items():
        if token in key.upper() and value:
            return value
    return default


def _process_hacienda_row(
    row: dict[str, str],
    filename: str,
    tenant_id: str,
    company_id: str,
    document_type: str | None,
    upload_id: str,
) -> dict[str, Any]:
    handler = _classify_filename(filename, document_type) or ""
    fecha_key = _first_key(row, "FECHA")
    transaction_date = _parse_date(row.get(fecha_key, "")).isoformat()

    if "CONTRIBUYENTE" in handler:
        gravada = _first_key(row, "GRAVADA")
        exenta = _first_key(row, "EXENTA")
        debito = _first_key(row, "DEBITO")
        nit = next(
            (
                value.strip()
                for key, value in row.items()
                if "NIT" in key.upper() and value.strip()
            ),
            "DESCONOCIDO",
        )
        name = next(
            (
                value
                for key, value in row.items()
                if ("NOMBRE" in key.upper() or "CLIENTE" in key.upper()) and value
            ),
            "DESCONOCIDO",
        )
        tipo_doc = _first_key(row, "TIPO", "DOC")
        record = {
            "client_id": nit,
            "customer_name": name,
            "amount": _parse_decimal(row.get(gravada, "0")),
            "iva_amount": _parse_decimal(row.get(debito, "0")),
            "exento_amount": _parse_decimal(row.get(exenta, "0")) if exenta else 0.0,
            "transaction_date": transaction_date,
            "transaction_type": "Ventas Contribuyente",
            "nit_dui": nit,
            "document_type": _norm_tipo_doc(row.get(tipo_doc, "03")),
        }
    elif "CONSUMIDOR" in handler:
        gravada = _first_key(row, "GRAVADA")
        exenta = next(
            (key for key in row if "EXENTA" in key.upper() or "EXENTO" in key.upper()),
            "",
        )
        amount = _parse_decimal(row.get(gravada, "0"))
        nit = next(
            (
                value.strip()
                for key, value in row.items()
                if ("NIT" in key.upper() or "DUI" in key.upper()) and value.strip()
            ),
            "CONSUMIDOR_FINAL",
        )
        tipo_doc = _first_key(row, "TIPO", "DOC")
        record = {
            "client_id": "CONSUMIDOR_FINAL",
            "customer_name": "CONSUMIDOR FINAL",
            "amount": amount,
            "iva_amount": round(amount * IVA_RATE, 2),
            "exento_amount": _parse_decimal(row.get(exenta, "0")) if exenta else 0.0,
            "transaction_date": transaction_date,
            "transaction_type": "Ventas Consumidor",
            "nit_dui": nit,
            "document_type": _norm_tipo_doc(row.get(tipo_doc, "01")),
        }
    elif "COMPRAS" in handler:
        gravada = _first_key(row, "COMPRA", "GRAVADA")
        exenta = next(
            (key for key in row if "EXENTA" in key.upper() or "EXENTO" in key.upper()),
            "",
        )
        credito = next(
            (
                key
                for key in row
                if "CREDITO" in key.upper()
                or ("DITO" in key.upper() and "FISC" in key.upper())
            ),
            "",
        )
        nit_key = _first_key(row, "NIT", "PROVEEDOR")
        nit = row.get(nit_key, "").strip() or "DESCONOCIDO"
        tipo_doc = _first_key(row, "TIPO", "DOC")
        record = {
            "client_id": nit,
            "customer_name": _first_value(row, "NOMBRE", "DESCONOCIDO"),
            "amount": _parse_decimal(row.get(gravada, "0")),
            "iva_amount": _parse_decimal(row.get(credito, "0")),
            "exento_amount": _parse_decimal(row.get(exenta, "0")) if exenta else 0.0,
            "transaction_date": transaction_date,
            "transaction_type": "Compras",
            "nit_dui": nit,
            "document_type": _norm_tipo_doc(row.get(tipo_doc, "03")),
        }
    else:
        values = list(row.values())
        if len(values) < 3:
            raise ValueError(f"Formato no reconocido en el archivo {filename}")
        record = {
            "client_id": str(values[0]),
            "amount": _parse_decimal(str(values[1])),
            "exento_amount": 0.0,
            "transaction_date": _parse_date(str(values[2])).isoformat(),
            "transaction_type": "Otros",
        }

    record.update(
        {
            "tenant_id": tenant_id,
            "company_id": company_id,
            "upload_id": upload_id,
            "status": "Valido",
        }
    )
    for field, limit in (("nit_dui", 20), ("document_type", 50), ("client_id", 255)):
        if field in record:
            record[field] = str(record[field])[:limit]
    return record


def _iter_records(
    content: str,
    filename: str,
    tenant_id: str,
    company_id: str,
    upload_id: str,
    document_type: str | None,
) -> Iterator[dict[str, Any]]:
    prepared, separator = _ensure_headers(content, filename, document_type)
    reader = csv.DictReader(io.StringIO(prepared), delimiter=separator)
    for row in reader:
        sanitized = {
            key.strip(): _sanitize_cell(value)
            for key, value in row.items()
            if key
        }
        yield _process_hacienda_row(
            sanitized,
            filename,
            tenant_id,
            company_id,
            document_type=document_type,
            upload_id=upload_id,
        )


def _update_status(
    client,
    *,
    upload_id: str,
    tax_doc_id: str | None,
    tenant_id: str,
    state: str,
    rows: int = 0,
    error_message: str | None = None,
) -> None:
    history_data: dict[str, Any] = {
        "status": state,
        "records_processed": rows,
        "error_message": error_message,
    }
    (
        client.table("csv_upload_history")
        .update(history_data)
        .eq("id", upload_id)
        .eq("tenant_id", tenant_id)
        .execute()
    )
    if tax_doc_id:
        tax_state = "success" if state == "success" else (
            "error" if state == "error" else "pending"
        )
        (
            client.table("tax_documents")
            .update(
                {
                    "status": tax_state,
                    "records_processed": rows,
                    "error_message": error_message,
                }
            )
            .eq("id", tax_doc_id)
            .eq("tenant_id", tenant_id)
            .execute()
        )


@celery_app.task(
    bind=True,
    name="app.worker.tasks.process_financial_csv",
    acks_late=True,
    reject_on_worker_lost=True,
)
def process_financial_csv(
    self,
    bucket_name: str,
    file_path: str,
    tenant_id: str,
    company_id: str,
    upload_id: str,
    tax_doc_id: str | None = None,
    document_type: str | None = None,
):
    """Process an upload exactly once and insert records in bounded batches."""
    client = get_supabase_admin_client()
    db_url = _get_db_url(client)

    if not db_url and client is None:
        raise RuntimeError("Neither PostgreSQL database nor Supabase service role is configured.")

    if db_url:
        import psycopg2
        import psycopg2.extras

        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()

        cur.execute(
            """
            SELECT status FROM public.csv_upload_history
            WHERE id = %s AND tenant_id = %s AND company_id = %s
            LIMIT 1;
            """,
            (upload_id, tenant_id, company_id),
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            logger.error("Upload %s does not belong to the supplied tenant/company", upload_id)
            return {"status": "error", "code": "UPLOAD_NOT_FOUND"}

        current_status = row[0]
        if current_status == "success":
            cur.close()
            conn.close()
            return {"status": "success", "idempotent": True}
        if current_status == "processing" and not self.request.delivery_info.get("redelivered"):
            cur.close()
            conn.close()
            return {"status": "processing", "idempotent": True}

        total_processed = 0
        latest_date: str | None = None
        batch: list[dict[str, Any]] = []

        def flush_batch_pg() -> None:
            nonlocal total_processed, batch
            if not batch:
                return
            records_to_insert = [
                (
                    str(uuid.uuid4()),
                    r.get("tenant_id"),
                    r.get("company_id"),
                    r.get("upload_id"),
                    r.get("client_id"),
                    r.get("customer_name"),
                    r.get("amount", 0.0),
                    r.get("iva_amount", 0.0),
                    r.get("exento_amount", 0.0),
                    r.get("transaction_date"),
                    r.get("transaction_type"),
                    r.get("nit_dui"),
                    r.get("document_type"),
                    r.get("status", "Valido"),
                )
                for r in batch
            ]
            insert_query = """
                INSERT INTO public.financial_records (
                    id, tenant_id, company_id, upload_id, client_id, customer_name,
                    amount, iva_amount, exento_amount, transaction_date, transaction_type,
                    nit_dui, document_type, status
                ) VALUES %s;
            """
            psycopg2.extras.execute_values(cur, insert_query, records_to_insert)
            total_processed += len(batch)
            batch = []

        try:
            # 1. Clean previous records and mark as processing
            cur.execute("DELETE FROM public.financial_records WHERE upload_id = %s AND tenant_id = %s;", (upload_id, tenant_id))
            cur.execute("UPDATE public.csv_upload_history SET status = 'processing' WHERE id = %s AND tenant_id = %s;", (upload_id, tenant_id))
            if tax_doc_id:
                cur.execute("UPDATE public.tax_documents SET status = 'processing' WHERE id = %s AND tenant_id = %s;", (tax_doc_id, tenant_id))

            # 2. Read payload from local disk volume or Supabase storage
            disk_path = Path("secure_uploads") / file_path
            if disk_path.exists():
                payload = disk_path.read_bytes()
            elif client:
                payload = client.storage.from_(bucket_name).download(file_path)
            else:
                raise FileNotFoundError(f"Archivo {file_path} no encontrado en disco ni almacenamiento.")

            # 3. Parse and insert
            if file_path.lower().endswith(".zip"):
                with zipfile.ZipFile(io.BytesIO(payload)) as archive:
                    for member in validated_archive_members(archive, ALLOWED_FILES):
                        filename = member.filename.replace("\\", "/").rsplit("/", 1)[-1]
                        content = _safe_decode(archive.read(member))
                        for record in _iter_records(
                            content,
                            filename,
                            tenant_id,
                            company_id,
                            upload_id,
                            None,
                        ):
                            batch.append(record)
                            record_date = record.get("transaction_date")
                            if record_date and (latest_date is None or record_date > latest_date):
                                latest_date = record_date
                            if len(batch) == INSERT_BATCH_SIZE:
                                flush_batch_pg()
            else:
                content = _safe_decode(payload)
                filename = file_path.rsplit("/", 1)[-1]
                for record in _iter_records(
                    content,
                    filename,
                    tenant_id,
                    company_id,
                    upload_id,
                    document_type,
                ):
                    batch.append(record)
                    record_date = record.get("transaction_date")
                    if record_date and (latest_date is None or record_date > latest_date):
                        latest_date = record_date
                    if len(batch) == INSERT_BATCH_SIZE:
                        flush_batch_pg()
            flush_batch_pg()

            # 4. Update company totals
            cur.execute(
                "SELECT COUNT(*) FROM public.financial_records WHERE company_id = %s AND tenant_id = %s;",
                (company_id, tenant_id),
            )
            count_row = cur.fetchone()
            total_records_count = count_row[0] if count_row else 0

            month_to_set = latest_date[:7] if latest_date else None
            cur.execute(
                """
                UPDATE public.companies 
                SET total_records = %s, status = 'active', last_processed_month = COALESCE(%s, last_processed_month)
                WHERE id = %s AND tenant_id = %s;
                """,
                (total_records_count, month_to_set, company_id, tenant_id),
            )

            # 5. Invalidate cache and mark as success
            invalidate_tenant_cache(tenant_id)
            cur.execute(
                """
                UPDATE public.csv_upload_history 
                SET status = 'success', records_processed = %s, error_message = NULL
                WHERE id = %s AND tenant_id = %s;
                """,
                (total_processed, upload_id, tenant_id),
            )
            if tax_doc_id:
                cur.execute(
                    """
                    UPDATE public.tax_documents 
                    SET status = 'success', records_processed = %s, error_message = NULL
                    WHERE id = %s AND tenant_id = %s;
                    """,
                    (total_processed, tax_doc_id, tenant_id),
                )

            # Remove disk file after success
            if disk_path.exists():
                try:
                    disk_path.unlink()
                except Exception:
                    pass

            cur.close()
            conn.close()
            return {"status": "success", "processed_rows": total_processed}
        except Exception:
            logger.exception("Financial upload processing failed for %s", upload_id)
            try:
                cur.execute(
                    """
                    UPDATE public.csv_upload_history 
                    SET status = 'error', records_processed = %s, error_message = 'El procesamiento del archivo falló.'
                    WHERE id = %s AND tenant_id = %s;
                    """,
                    (total_processed, upload_id, tenant_id),
                )
                if tax_doc_id:
                    cur.execute(
                        """
                        UPDATE public.tax_documents 
                        SET status = 'error', records_processed = %s, error_message = 'El procesamiento del archivo falló.'
                        WHERE id = %s AND tenant_id = %s;
                        """,
                        (total_processed, tax_doc_id, tenant_id),
                    )
            except Exception:
                logger.exception("Could not mark upload %s as failed in PostgreSQL", upload_id)
            finally:
                cur.close()
                conn.close()
            return {"status": "error", "code": "PROCESSING_FAILED"}

    # Fallback to Supabase client (used in unit tests)
    history = (
        client.table("csv_upload_history")
        .select("status,tenant_id,company_id")
        .eq("id", upload_id)
        .eq("tenant_id", tenant_id)
        .eq("company_id", company_id)
        .limit(1)
        .execute()
    )
    if not history.data:
        logger.error("Upload %s does not belong to the supplied tenant/company", upload_id)
        return {"status": "error", "code": "UPLOAD_NOT_FOUND"}

    current_status = history.data[0].get("status")
    if current_status == "success":
        return {"status": "success", "idempotent": True}
    if current_status == "processing" and not self.request.delivery_info.get("redelivered"):
        return {"status": "processing", "idempotent": True}

    total_processed = 0
    latest_date = None
    batch = []

    def flush_batch() -> None:
        nonlocal total_processed, batch
        if not batch:
            return
        client.table("financial_records").insert(batch).execute()
        total_processed += len(batch)
        batch = []

    try:
        (
            client.table("financial_records")
            .delete()
            .eq("upload_id", upload_id)
            .eq("tenant_id", tenant_id)
            .execute()
        )
        _update_status(
            client,
            upload_id=upload_id,
            tax_doc_id=tax_doc_id,
            tenant_id=tenant_id,
            state="processing",
        )
        payload = client.storage.from_(bucket_name).download(file_path)

        if file_path.lower().endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(payload)) as archive:
                for member in validated_archive_members(archive, ALLOWED_FILES):
                    filename = member.filename.replace("\\", "/").rsplit("/", 1)[-1]
                    content = _safe_decode(archive.read(member))
                    for record in _iter_records(
                        content,
                        filename,
                        tenant_id,
                        company_id,
                        upload_id,
                        None,
                    ):
                        batch.append(record)
                        record_date = record.get("transaction_date")
                        if record_date and (latest_date is None or record_date > latest_date):
                            latest_date = record_date
                        if len(batch) == INSERT_BATCH_SIZE:
                            flush_batch()
        else:
            content = _safe_decode(payload)
            filename = file_path.rsplit("/", 1)[-1]
            for record in _iter_records(
                content,
                filename,
                tenant_id,
                company_id,
                upload_id,
                document_type,
            ):
                batch.append(record)
                record_date = record.get("transaction_date")
                if record_date and (latest_date is None or record_date > latest_date):
                    latest_date = record_date
                if len(batch) == INSERT_BATCH_SIZE:
                    flush_batch()
        flush_batch()

        count_response = (
            client.table("financial_records")
            .select("id", count="exact")
            .eq("company_id", company_id)
            .eq("tenant_id", tenant_id)
            .execute()
        )
        company_data: dict[str, Any] = {
            "total_records": count_response.count or 0,
            "status": "active",
        }
        if latest_date:
            company_data["last_processed_month"] = latest_date[:7]
        (
            client.table("companies")
            .update(company_data)
            .eq("id", company_id)
            .eq("tenant_id", tenant_id)
            .execute()
        )
        invalidate_tenant_cache(tenant_id)
        _update_status(
            client,
            upload_id=upload_id,
            tax_doc_id=tax_doc_id,
            tenant_id=tenant_id,
            state="success",
            rows=total_processed,
        )
        try:
            client.storage.from_(bucket_name).remove([file_path])
        except Exception:
            logger.exception("Could not remove processed upload %s", file_path)
        return {"status": "success", "processed_rows": total_processed}
    except Exception:
        logger.exception("Financial upload processing failed for %s", upload_id)
        try:
            _update_status(
                client,
                upload_id=upload_id,
                tax_doc_id=tax_doc_id,
                tenant_id=tenant_id,
                state="error",
                rows=total_processed,
                error_message="El procesamiento del archivo falló.",
            )
        except Exception:
            logger.exception("Could not mark upload %s as failed", upload_id)
        return {"status": "error", "code": "PROCESSING_FAILED"}
