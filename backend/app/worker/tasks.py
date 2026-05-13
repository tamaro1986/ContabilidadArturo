import csv
import io
import logging
import re
import uuid
import zipfile
from datetime import date, datetime
from typing import Any
import duckdb
from app.services.supabase_client import get_supabase_admin_client
from app.services.duckdb_client import get_duckdb_client

logger = logging.getLogger(__name__)

# --- Constantes Hacienda ---
IVA_RATE = 0.13
ALLOWED_FILES = {
    "F07_ANEXO_CONTRIBUYENTES.csv",
    "F07_ANEXO_CONSUMIDOR_FINAL.csv",
    "F07_ANEXO_COMPRAS.csv",
    "F07_CASILLA_66.csv",
    "F07_DETALLE_DOCUMENTOS.csv",
    "F14_ANEXO_RENTA.csv",
    "F14_ANEXO_Q25.csv",
}

# --- Utilidades Sanitización & Parseo (Ported from seeder.py) ---

def _sanitize_cell(value: str) -> str:
    if not isinstance(value, str):
        return value
    value = value.replace("\x00", "").strip()
    if value and value[0] in ("=", "+", "-", "@", "\t", "\r"):
        value = "'" + value
    return value

def _parse_date(raw: str) -> date:
    raw = raw.strip()
    for fmt in ("%d/%m/%Y", "%m/%Y"):
        try:
            dt = datetime.strptime(raw, fmt).date()
            return dt.replace(day=1) if fmt == "%m/%Y" else dt
        except ValueError:
            continue
    if len(raw) == 6 and raw.isdigit():
        try:
            return datetime.strptime(raw, "%m%Y").date().replace(day=1)
        except ValueError:
            pass
    return date.today()

def _parse_decimal(raw: str) -> float:
    if not raw: return 0.0
    cleaned = re.sub(r"[^\d.\-]", "", raw.strip())
    try:
        return float(cleaned)
    except:
        return 0.0

def _norm_clase_doc(raw: str) -> str:
    m = re.match(r"^(\d+)", raw.strip())
    return m.group(1) if m else "1"

def _norm_tipo_doc(raw: str) -> str:
    m = re.match(r"^0*(\d+)", raw.strip())
    return m.group(0).zfill(2) if m else (raw[:2] if raw else "00")

# --- Procesamiento de Filas Específicas ---

def _process_hacienda_row(row: dict, filename: str, tenant_id: str, company_id: str) -> dict:
    """Mapea una fila de CSV de Hacienda al esquema de financial_records."""
    try:
        record = None
        if "CONTRIBUYENTES" in filename.upper():
            amount = _parse_decimal(row.get("VENTAS GRAVADAS LOCALES", "0"))
            iva = _parse_decimal(row.get("DEBITO FISCAL", "0"))
            exento_key = next((k for k in row if "EXENTA" in k.upper()), "")
            exento = _parse_decimal(row.get(exento_key, "0")) if exento_key else 0.0
            nit = row.get("NIT O NRC DEL CLIENTE", "").strip() or "DESCONOCIDO"
            name = next((v for k, v in row.items() if "NOMBRE" in k.upper()), "DESCONOCIDO")
            fecha_raw = next((v for k, v in row.items() if "FECHA" in k.upper()), "")
            record = {
                "tenant_id": tenant_id, "company_id": company_id, "client_id": nit, "customer_name": name,
                "amount": amount, "iva_amount": iva, "exento_amount": exento, "transaction_date": _parse_date(fecha_raw).isoformat(),
                "transaction_type": "Ventas Contribuyente", "nit_dui": nit,
                "document_type": _norm_tipo_doc(row.get("TIPO DE DOCUMENTO", "03")),
                "clase_de_documento": _norm_clase_doc(row.get("CLASE DE DOCUMENTO", "1"))
            }
        
        elif "CONSUMIDOR_FINAL" in filename.upper():
            amount = _parse_decimal(row.get("VENTAS GRAVADAS LOCALES", "0"))
            exento_key = next((k for k in row if "EXENTA" in k.upper()), "")
            exento = _parse_decimal(row.get(exento_key, "0")) if exento_key else 0.0
            fecha_raw = next((v for k, v in row.items() if "FECHA" in k.upper()), "")
            doc_desde = row.get("N\u00daMERO DE DOCUMENTO (DEL)", row.get("NUMERO DE DOCUMENTO (DEL)", ""))
            record = {
                "tenant_id": tenant_id, "company_id": company_id, "client_id": "CONSUMIDOR_FINAL", "customer_name": "CONSUMIDOR FINAL",
                "amount": amount, "iva_amount": round(amount * IVA_RATE, 2), "exento_amount": exento, "transaction_date": _parse_date(fecha_raw).isoformat(),
                "transaction_type": "Ventas Consumidor", "nit_dui": doc_desde.strip(),
                "document_type": _norm_tipo_doc(row.get("TIPO DE DOCUMENTO", "01"))
            }

        elif "COMPRAS" in filename.upper():
            amount = _parse_decimal(row.get("COMPRAS INTERNAS GRAVADAS", "0"))
            exento_key = next((k for k in row if "EXENTA" in k.upper()), "")
            exento = _parse_decimal(row.get(exento_key, "0")) if exento_key else 0.0
            iva_key = next((k for k in row if "DITO" in k.upper() and "FISC" in k.upper()), "")
            iva = _parse_decimal(row.get(iva_key, "0"))
            nit = row.get("NIT O NRC DEL PROVEEDOR", "").strip() or "DESCONOCIDO"
            name = next((v for k, v in row.items() if "NOMBRE" in k.upper()), "DESCONOCIDO")
            fecha_raw = next((v for k, v in row.items() if "FECHA" in k.upper()), "")
            record = {
                "tenant_id": tenant_id, "company_id": company_id, "client_id": nit, "customer_name": name,
                "amount": amount, "iva_amount": iva, "exento_amount": exento, "transaction_date": _parse_date(fecha_raw).isoformat(),
                "transaction_type": "Compras", "nit_dui": nit,
                "document_type": _norm_tipo_doc(row.get("TIPO DE DOCUMENTO", "03"))
            }

        # Fallback para CSV genérico (3 columnas: client_id, amount, date)
        else:
            vals = list(row.values())
            if len(vals) >= 3:
                record = {
                    "tenant_id": tenant_id,
                    "company_id": company_id,
                    "client_id": str(vals[0]),
                    "amount": _parse_decimal(str(vals[1])),
                    "exento_amount": 0.0,
                    "transaction_date": _parse_date(str(vals[2])).isoformat(),
                    "transaction_type": "Otros"
                }
        
        if record:
            record["status"] = "Valido"
            return record
        else:
            raise ValueError(f"Formato no reconocido en el archivo {filename}")

    except Exception as e:
        logger.error(f"Error procesando fila en {filename}: {e}")
        raise ValueError(f"Fallo en validaciones fiscales o formato: {str(e)}")

# --- Tarea Principal ---

def process_financial_csv(bucket_name: str, file_path: str, tenant_id: str, company_id: str, upload_id: str = None, tax_doc_id: str = None):
    supabase = get_supabase_admin_client()
    
    def update_status(status: str, rows: int = 0, error: str = None):
        if upload_id:
            data = {"status": status, "records_processed": rows}
            if error: data["error_message"] = error[:250]
            supabase.table("csv_upload_history").update(data).eq("id", upload_id).execute()
        if tax_doc_id:
            tax_status = "success" if status == "success" else ("error" if status == "error" else "pending")
            supabase.table("tax_documents").update({"status": tax_status}).eq("id", tax_doc_id).execute()

    try:
        update_status("processing")
        
        # 1. Descargar archivo
        res = supabase.storage.from_(bucket_name).download(file_path)
        
        # 2. Análisis Analítico Vectorial (DuckDB Premium Feature)
        # Usamos DuckDB para una validación ultra-rápida del volumen de datos
        try:
            # Si es ZIP, no podemos leerlo directamente con read_csv_auto fácilmente sin extraer
            # pero para CSV individuales es instantáneo.
            if not file_path.endswith('.zip'):
                # Creamos un archivo temporal para DuckDB
                temp_file = f"temp_{upload_id}.csv"
                with open(temp_file, "wb") as f:
                    f.write(res)
                
                con = get_duckdb_client()
                duck_res = con.execute(f"SELECT count(*) FROM read_csv_auto('{temp_file}')").fetchone()
                logger.info(f"DuckDB Análisis: {duck_res[0]} registros detectados en {file_path}")
                import os
                os.remove(temp_file)
        except Exception as e:
            logger.warning(f"DuckDB Pre-analysis skipped: {e}")

        files_to_process = {}
        # 2. Detectar si es ZIP o CSV
        if file_path.endswith('.zip'):
            with zipfile.ZipFile(io.BytesIO(res), 'r') as zf:
                for name in zf.namelist():
                    basename = re.sub(r'^.*/', '', name)
                    if basename in ALLOWED_FILES:
                        files_to_process[basename] = zf.read(name).decode('latin-1')
        else:
            files_to_process[re.sub(r'^.*/', '', file_path)] = res.decode('latin-1')

        total_processed = 0
        all_records = []

        # 3. Procesar cada archivo
        for filename, content in files_to_process.items():
            reader = csv.DictReader(io.StringIO(content))
            for row in reader:
                sanitized_row = {k.strip(): _sanitize_cell(v) for k, v in row.items() if k}
                record = _process_hacienda_row(sanitized_row, filename, tenant_id, company_id)
                if record:
                    all_records.append(record)

        # 4. Inserción en bloques
        if all_records:
            for i in range(0, len(all_records), 500):
                chunk = all_records[i:i + 500]
                supabase.table("financial_records").insert(chunk).execute()
                total_processed += len(chunk)

        # 5. Limpieza y finalización
        supabase.storage.from_(bucket_name).remove([file_path])
        update_status("success", total_processed)
        
        return {"status": "success", "processed_rows": total_processed}
        
    except Exception as e:
        logger.error(f"Error crítico en process_financial_csv: {e}")
        update_status("error", error=str(e))
        return {"status": "error", "error_message": str(e)}


