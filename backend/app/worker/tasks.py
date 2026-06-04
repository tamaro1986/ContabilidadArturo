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
from app.services.cache import invalidate_tenant_cache

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
    if value is None:
        return ""
    if not isinstance(value, str):
        return str(value)
    value = value.replace("\x00", "").strip()
    if value and value[0] in ("=", "+", "-", "@", "\t", "\r"):
        value = "'" + value
    return value

def _parse_date(raw: str) -> date:
    raw = (raw or "").strip()
    for fmt in ("%d/%m/%Y", "%m/%Y", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(raw, fmt).date()
            return dt.replace(day=1) if fmt == "%m/%Y" else dt
        except ValueError:
            continue
    # Handle non-padded days/months (e.g., "5/7/2024") on platforms where strptime is strict
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", raw)
    if m:
        return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    if len(raw) == 6 and raw.isdigit():
        try:
            return datetime.strptime(raw, "%m%Y").date().replace(day=1)
        except ValueError:
            pass
    return date.today()

def _parse_decimal(raw: str) -> float:
    if not raw: return 0.0
    cleaned = re.sub(r"[^\d.\-]", "", (raw or "").strip())
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

def _safe_decode(content_bytes: bytes) -> str:
    """Decodifica un archivo binario a string de forma segura probando UTF-8 (con BOM) y luego Latin-1."""
    try:
        return content_bytes.decode('utf-8-sig')
    except UnicodeDecodeError:
        try:
            return content_bytes.decode('utf-8')
        except UnicodeDecodeError:
            return content_bytes.decode('latin-1')

# --- Procesamiento de Filas Específicas ---

# Mapeo de document_type al nombre que aparece en el trigger de filename
_DOC_TYPE_TO_HANDLER = {
    "VentasContribuyente": "CONTRIBUYENTES",
    "VentasConsumidor": "CONSUMIDOR_FINAL",
    "Compras": "COMPRAS",
}

def _process_hacienda_row(row: dict, filename: str, tenant_id: str, company_id: str, document_type: str = None, upload_id: str = None) -> dict:
    """Mapea una fila de CSV de Hacienda al esquema de financial_records."""
    try:
        record = None
        handler_key = (document_type or filename).upper()
        # Normalizar: singular/plural, espacios y guiones
        handler_key = handler_key.replace(" ", "").replace("-", "")
        if "CONTRIBUYENTE" in handler_key:
            grav_key = next((k for k in row if "GRAVADA" in k.upper()), "")
            amount = _parse_decimal(row.get(grav_key, "0"))
            iva_key = next((k for k in row if "DEBITO" in k.upper() or "DITO" in k.upper()), "")
            iva = _parse_decimal(row.get(iva_key, "0"))
            exento_key = next((k for k in row if "EXENTA" in k.upper() or "EXENTO" in k.upper()), "")
            exento = _parse_decimal(row.get(exento_key, "0")) if exento_key else 0.0
            # Búsqueda robusta de NIT Cliente
            nit_keys = ["NIT CLIENTE", "NIT", "NIT CLIENTE:", "CLIENTE NIT", "ID CLIENTE"]
            nit_key = next((k for k in row if any(key.upper() in k.upper() for key in nit_keys)), "")
            nit = row.get(nit_key, "").strip()
            
            # Si no se encontró por NIT, intentar buscar por otro identificador o marca
            if not nit or nit == "DESCONOCIDO":
                # Fallback: buscar cualquier columna que tenga "NIT"
                nit_key = next((k for k in row if "NIT" in k.upper()), "")
                nit = row.get(nit_key, "").strip()
            
            # Si sigue sin encontrarse, dejarlo como 'DESCONOCIDO' pero con log
            if not nit:
                nit = "DESCONOCIDO"
                logger.warning(f"NIT no encontrado en fila para {filename}")
            
            name_keys = ["NOMBRE CLIENTE", "NOMBRE", "CLIENTE"]
            name_key = next((k for k in row if any(key.upper() in k.upper() for key in name_keys)), "")
            name = row.get(name_key, "DESCONOCIDO")
            
            fecha_raw = next((v for k, v in row.items() if "FECHA" in k.upper()), "")
            tipo_doc_key = next((k for k in row if "TIPO" in k.upper() and "DOC" in k.upper()), "")
            record = {
                "tenant_id": tenant_id, "company_id": company_id, "client_id": nit, "customer_name": name,
                "amount": amount, "iva_amount": iva, "exento_amount": exento, "transaction_date": _parse_date(fecha_raw).isoformat(),
                "transaction_type": "Ventas Contribuyente", "nit_dui": nit,
                "document_type": _norm_tipo_doc(row.get(tipo_doc_key, "03")),
                "upload_id": upload_id  # Inyección de Trazabilidad
            }
        
        elif "CONSUMIDOR" in handler_key:
            grav_key = next((k for k in row if "GRAVADA" in k.upper()), "")
            amount = _parse_decimal(row.get(grav_key, "0"))
            exento_key = next((k for k in row if "EXENTA" in k.upper() or "EXENTO" in k.upper()), "")
            exento = _parse_decimal(row.get(exento_key, "0")) if exento_key else 0.0
            fecha_raw = next((v for k, v in row.items() if "FECHA" in k.upper()), "")
            
            # Búsqueda inteligente de datos del cliente (DTE)
            name_key = next((k for k in row if "NOMBRE" in k.upper() or "RECEPTOR" in k.upper()), "")
            name = row.get(name_key, "").strip() or "CONSUMIDOR FINAL"
            
            nit_key = next((k for k in row if "NIT" in k.upper() or "DUI" in k.upper()), "")
            nit = row.get(nit_key, "").strip() or "CONSUMIDOR_FINAL"
            
            tipo_doc_key = next((k for k in row if "TIPO" in k.upper() and "DOC" in k.upper()), "")
            
            record = {
                "tenant_id": tenant_id, "company_id": company_id, "client_id": "CONSUMIDOR_FINAL", "customer_name": "CONSUMIDOR FINAL",
                "amount": amount, "iva_amount": round(amount * IVA_RATE, 2), "exento_amount": exento, "transaction_date": _parse_date(fecha_raw).isoformat(),
                "transaction_type": "Ventas Consumidor", "nit_dui": nit,
                "document_type": _norm_tipo_doc(row.get(tipo_doc_key, "01")),
                "upload_id": upload_id
            }

        elif "COMPRAS" in handler_key:
            compras_key = next((k for k in row if "COMPRA" in k.upper() and "GRAVADA" in k.upper()), "")
            amount = _parse_decimal(row.get(compras_key, "0"))
            exento_key = next((k for k in row if "EXENTA" in k.upper() or "EXENTO" in k.upper()), "")
            exento = _parse_decimal(row.get(exento_key, "0")) if exento_key else 0.0
            iva_key = next((k for k in row if "CREDITO" in k.upper() or "DITO" in k.upper() and "FISC" in k.upper()), "")
            iva = _parse_decimal(row.get(iva_key, "0"))
            nit_key = next((k for k in row if "NIT" in k.upper() and "PROVEEDOR" in k.upper()), "")
            nit = row.get(nit_key, "").strip() or "DESCONOCIDO"
            name = next((v for k, v in row.items() if "NOMBRE" in k.upper()), "DESCONOCIDO")
            fecha_raw = next((v for k, v in row.items() if "FECHA" in k.upper()), "")
            tipo_doc_key = next((k for k in row if "TIPO" in k.upper() and "DOC" in k.upper()), "")
            record = {
                "tenant_id": tenant_id, "company_id": company_id, "client_id": nit, "customer_name": name,
                "amount": amount, "iva_amount": iva, "exento_amount": exento, "transaction_date": _parse_date(fecha_raw).isoformat(),
                "transaction_type": "Compras", "nit_dui": nit,
                "document_type": _norm_tipo_doc(row.get(tipo_doc_key, "03")),
                "upload_id": upload_id
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
            # Sanitización de seguridad: truncar campos que exceden límites de BD
            if "nit_dui" in record:
                record["nit_dui"] = str(record["nit_dui"])[:20]
            if "document_type" in record:
                record["document_type"] = str(record["document_type"])[:50]
            if "client_id" in record:
                record["client_id"] = str(record["client_id"])[:255]
            
            logger.debug(f"Record sanitizado y listo para inserción: {record}")
            return record
        else:
            raise ValueError(f"Formato no reconocido en el archivo {filename}")

    except Exception as e:
        logger.error(f"Error procesando fila en {filename}: {e}")
        raise ValueError(f"Fallo en validaciones fiscales o formato: {str(e)}")

# --- Inyección de Encabezados para CSVs sin Headers (Formato LIBRO Hacienda) ---

_LIBRO_HEADERS = {
    "CONTRIBUYENTE": "FECHA_EMISION,CLASE_DOC,TIPO_DOC,NUM_RESOLUCION,SERIE,NUM_DOC,NUM_CONTROL,NIT_CLIENTE,NOMBRE_CLIENTE,VENTAS_EXENTAS,VENTAS_NO_SUJETAS,VENTAS_GRAVADAS,DEBITO_FISCAL,VENTAS_TERCEROS,DEBITO_TERCEROS,TOTAL_VENTA,DUI_CLIENTE,TIPO_OPERACION,TIPO_INGRESO,NUM_ANEXO",
    "CONSUMIDOR": "FECHA_EMISION,CLASE_DOC,TIPO_DOC,NUM_RESOLUCION,SERIE,NUM_CONTROL_DESDE,NUM_CONTROL_HASTA,NUM_DOC_DESDE,NUM_DOC_HASTA,NUM_MAQUINA,VENTAS_EXENTAS,VENTAS_INTERNAS_EXENTAS,VENTAS_NO_SUJETAS,VENTAS_GRAVADAS,EXPORTACIONES_CENTROAMERICA,EXPORTACIONES_FUERA_CENTROAMERICA,EXPORTACIONES_SERVICIO,VENTAS_ZONAS_FRANCAS,VENTAS_TERCEROS,TOTAL_VENTAS,TIPO_OPERACION,TIPO_INGRESO,NUM_ANEXO",
    "COMPRAS": "FECHA_EMISION,CLASE_DOC,TIPO_DOC,NUM_DOC,NIT_PROVEEDOR,NOMBRE_PROVEEDOR,COMPRAS_INTERNAS_EXENTAS,INTERNACIONES_EXENTAS,IMPORTACIONES_EXENTAS,COMPRAS_INTERNAS_GRAVADAS,INTERNACIONES_GRAVADAS,IMPORTACIONES_GRAVADAS_BIENES,IMPORTACIONES_GRAVADAS_SERVICIOS,CREDITO_FISCAL,TOTAL_COMPRAS,DUI_PROVEEDOR,TIPO_OPERACION,CLASIFICACION,SECTOR,TIPO_COSTO_GASTO,NUM_ANEXO",
}

def _detect_separator(content: str) -> str:
    """Detecta el separador de un CSV probando coma, punto y coma, tabulador y pipe."""
    lines = content.strip().split("\n")
    if not lines:
        return ","
    line = lines[0]
    counts = {s: line.count(s) for s in (",", ";", "\t", "|")}
    best = max(counts, key=counts.get)
    return best if counts[best] > 0 else ","

def _ensure_headers(content: str, filename: str = "", document_type: str = None) -> tuple:
    """Pre-ppone encabezados Hacienda si el CSV no tiene fila de encabezados.
    Retorna (contenido, separador_detectado)."""
    lines = content.strip().split("\n")
    if not lines:
        return content, ","

    sep = _detect_separator(content)
    first_row = lines[0].split(sep)

    header_keywords = ["FECHA", "TIPO", "DOC", "NIT", "NOMBRE", "CLIENTE", "PROVEEDOR", "GRAVADA", "EXENTA", "DEBITO"]
    has_headers = any(any(k in cell.upper() for k in header_keywords) for cell in first_row)
    if has_headers:
        return content, sep

    # Determinar tipo de documento
    key = (document_type or filename or "").upper().replace(" ", "").replace("-", "")
    template = None
    if "CONTRIBUYENTE" in key:
        template = _LIBRO_HEADERS["CONTRIBUYENTE"]
    elif "CONSUMIDOR" in key:
        template = _LIBRO_HEADERS["CONSUMIDOR"]
    elif "COMPRAS" in key:
        template = _LIBRO_HEADERS["COMPRAS"]

    if template:
        template_line = template.replace(",", sep)
        content = template_line + "\n" + content
        logger.info("Encabezados Hacienda inyectados para CSV sin headers (%s) con separador '%s'", key, sep)

    return content, sep

# --- Tarea Principal ---

def process_financial_csv(bucket_name: str, file_path: str, tenant_id: str, company_id: str, upload_id: str = None, tax_doc_id: str = None, document_type: str = None):
    supabase = get_supabase_admin_client()
    
    def update_status(status: str, rows: int = 0, error: str = None):
        if upload_id:
            data = {"status": status, "records_processed": rows}
            if error: data["error_message"] = error[:250]
            supabase.table("csv_upload_history").update(data).eq("id", upload_id).execute()
        if tax_doc_id:
            tax_status = "success" if status == "success" else ("error" if status == "error" else "pending")
            supabase.table("tax_documents").update({"status": tax_status, "records_processed": rows}).eq("id", tax_doc_id).execute()

    try:
        update_status("processing")
        
        # 1. Descargar archivo
        res = supabase.storage.from_(bucket_name).download(file_path)
        
        # 2. Análisis Analítico Vectorial (DuckDB — siempre conexión directa para CSV)
        try:
            if not file_path.endswith('.zip'):
                temp_file = f"temp_{upload_id}.csv"
                with open(temp_file, "wb") as f:
                    f.write(res)

                duck_csv_con = duckdb.connect(':memory:')
                duck_res = duck_csv_con.execute("SELECT count(*) FROM read_csv_auto(?)", [temp_file]).fetchone()
                logger.info(f"DuckDB Análisis: {duck_res[0]} registros detectados en {file_path}")
                import os
                os.remove(temp_file)
                duck_csv_con.close()
        except Exception as e:
            logger.warning(f"DuckDB Pre-analysis skipped: {e}")

        files_to_process = {}
        # 2. Detectar si es ZIP o CSV
        if file_path.endswith('.zip'):
            with zipfile.ZipFile(io.BytesIO(res), 'r') as zf:
                for name in zf.namelist():
                    basename = re.sub(r'^.*/', '', name)
                    if basename in ALLOWED_FILES:
                        files_to_process[basename] = _safe_decode(zf.read(name))
        else:
            files_to_process[re.sub(r'^.*/', '', file_path)] = _safe_decode(res)

        total_processed = 0
        all_records = []

        # 3. Procesar cada archivo
        handler_doc_type = document_type if not file_path.endswith('.zip') else None
        for filename, content in files_to_process.items():
            content, sep = _ensure_headers(content, filename=filename, document_type=handler_doc_type)
            reader = csv.DictReader(io.StringIO(content), delimiter=sep)
            for row in reader:
                sanitized_row = {k.strip(): _sanitize_cell(v) for k, v in row.items() if k}
                record = _process_hacienda_row(sanitized_row, filename, tenant_id, company_id, document_type=handler_doc_type, upload_id=upload_id)
                if record:
                    all_records.append(record)

        # 4. Inserción en bloques
        if all_records:
            for i in range(0, len(all_records), 500):
                chunk = all_records[i:i + 500]
                supabase.table("financial_records").insert(chunk).execute()
                total_processed += len(chunk)

        # 5. Actualizar metadata de la compañía
        if total_processed > 0 and company_id:
            try:
                # Obtener el total real acumulativo de registros en la base de datos
                count_res = supabase.table("financial_records")\
                    .select("id", count="exact")\
                    .eq("company_id", company_id)\
                    .execute()
                total_records_db = count_res.count
                
                update_data = {
                    "total_records": total_records_db,
                    "status": "active"
                }
                
                # Obtener la fecha más reciente de los registros procesados en esta carga
                dates = [r.get("transaction_date") for r in all_records if r.get("transaction_date")]
                if dates:
                    latest_date = max(dates)
                    update_data["last_processed_month"] = latest_date[:7]
                
                supabase.table("companies").update(update_data).eq("id", company_id).execute()
            except Exception as e:
                logger.warning(f"No se pudo actualizar metadata de compañía {company_id}: {e}")

        # 6. Invalidar cache Redis para que los analytics reflejen los nuevos datos
        invalidate_tenant_cache(tenant_id)

        # 7. Limpieza y finalización
        supabase.storage.from_(bucket_name).remove([file_path])
        update_status("success", total_processed)
        
        return {"status": "success", "processed_rows": total_processed}
        
    except Exception as e:
        logger.error(f"Error crítico en process_financial_csv: {e}")
        update_status("error", error=str(e))
        return {"status": "error", "error_message": str(e)}


