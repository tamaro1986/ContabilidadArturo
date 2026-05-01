"""
seeder.py — Cargador determinístico de datos estructurados para Modo Simulación.
Lee 7 archivos CSV del Ministerio de Hacienda de El Salvador (F07 / F14)
desde un archivo .zip y los mapea al esquema pg.financial_records de DuckDB.

Seguridad OWASP CSV aplicada:
  - Whitelist de nombres de archivo permitidos en el ZIP
  - Validación anti-path-traversal en cada miembro del ZIP
  - Sanitización anti-CSV-injection en cada celda
  - Límite de tamaño (10 MB por archivo)
  - Encoding forzado a latin-1 (formato Hacienda El Salvador)
"""

import csv
import io
import logging
import re
import shutil
import uuid
import zipfile
from datetime import date, datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ── Constantes ────────────────────────────────────────────────────────────────

TENANT_ID = "tenant_A"

# Nombres exactos de archivo permitidos dentro del ZIP (whitelist)
ALLOWED_FILES = {
    "F07_ANEXO_CONTRIBUYENTES.csv",
    "F07_ANEXO_CONSUMIDOR_FINAL.csv",
    "F07_ANEXO_COMPRAS.csv",
    "F07_CASILLA_66.csv",
    "F07_DETALLE_DOCUMENTOS.csv",
    "F14_ANEXO_RENTA.csv",
    "F14_ANEXO_Q25.csv",
}

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB por archivo
IVA_RATE = 0.13
IVA_TOLERANCE = 0.03  # delta máximo admitido sin warning


# ── Seguridad OWASP ───────────────────────────────────────────────────────────

def _sanitize_cell(value: str) -> str:
    """
    Previene CSV Injection: si la celda empieza con =, +, -, @, TAB o CR
    se prefija con un apóstrofe para neutralizarla como fórmula.
    Elimina NULL-bytes.
    """
    if not isinstance(value, str):
        return value
    value = value.replace("\x00", "").strip()
    if value and value[0] in ("=", "+", "-", "@", "\t", "\r"):
        value = "'" + value
    return value


def _read_csv_secure(raw_bytes: bytes, filename: str) -> list[dict[str, str]]:
    """
    Decodifica los bytes con latin-1, parsea el CSV y sanitiza todas las celdas.
    Aplica límite de tamaño antes de procesar.
    """
    if len(raw_bytes) > MAX_FILE_BYTES:
        raise ValueError(f"Archivo {filename} supera el límite de {MAX_FILE_BYTES} bytes")

    # Eliminar BOM UTF-8/latin-1 si está presente al inicio del archivo
    text = raw_bytes.decode("latin-1").lstrip("\ufeff\xff\xfe")
    reader = csv.DictReader(io.StringIO(text))
    rows = []
    for row in reader:
        # Limpiar claves: strip + eliminar caracteres de control invisibles
        sanitized = {
            k.strip().lstrip("\ufeff\xff\xfe"): _sanitize_cell(v)
            for k, v in row.items() if k
        }
        rows.append(sanitized)
    return rows


# ── Utilidades de parseo ──────────────────────────────────────────────────────

def _parse_date(raw: str) -> date:
    """Acepta DD/MM/YYYY o MM/YYYY (retorna primer día del mes)."""
    raw = raw.strip()
    try:
        return datetime.strptime(raw, "%d/%m/%Y").date()
    except ValueError:
        pass
    try:
        return datetime.strptime(raw, "%m/%Y").date().replace(day=1)
    except ValueError:
        pass
    # Formato MMYYYY (F14)
    if len(raw) == 6 and raw.isdigit():
        return datetime.strptime(raw, "%m%Y").date().replace(day=1)
    raise ValueError(f"Fecha no reconocida: {raw!r}")


def _parse_decimal(raw: str) -> float:
    """Elimina comas de miles y convierte a float."""
    cleaned = re.sub(r"[^\d.\-]", "", raw.strip())
    return float(cleaned) if cleaned else 0.0


def _norm_clase_doc(raw: str) -> str:
    """'1. IMPRESO POR IMPRENTA...' → '1'"""
    raw = raw.strip()
    m = re.match(r"^(\d+)", raw)
    return m.group(1) if m else "1"


def _norm_tipo_doc(raw: str) -> str:
    """'03. COMPROBANTE DE CRÉDITO FISCAL' → '03'"""
    raw = raw.strip()
    m = re.match(r"^0*(\d+)", raw)
    return m.group(0).zfill(2) if m else raw[:2]


def _validate_iva(amount: float, iva: float, context: str) -> None:
    expected = round(amount * IVA_RATE, 2)
    delta = abs(iva - expected)
    if delta > IVA_TOLERANCE:
        logger.warning(
            "[IVA-AUDIT] %s | amount=%.2f expected_iva=%.2f got_iva=%.2f delta=%.2f",
            context, amount, expected, iva, delta,
        )


def _make_record(
    *,
    tenant_id: str = TENANT_ID,
    client_id: str,
    customer_name: str = "DESCONOCIDO",
    amount: float,
    transaction_date: date,
    transaction_type: str,
    document_type: str,
    clase_de_documento: str,
    nit_dui: str,
    codigo_generacion: str | None = None,
    sello_recepcion: str | None = None,
    iva_amount: float = 0.0,
    retention_amount: float = 0.0,
    retention_percentage: float = 0.0,
    afp_amount: float = 0.0,
    isss_amount: float = 0.0,
    status: str = "Valido",
) -> tuple:
    return (
        str(uuid.uuid4()),
        tenant_id,
        client_id,
        customer_name,
        round(amount, 2),
        transaction_date.strftime("%Y-%m-%d"),
        transaction_type,
        document_type,
        clase_de_documento,
        nit_dui,
        codigo_generacion,
        sello_recepcion,
        round(iva_amount, 2),
        round(retention_amount, 2),
        round(retention_percentage, 2),
        round(afp_amount, 2),
        round(isss_amount, 2),
        status,
    )


_INSERT_SQL = """
    INSERT INTO pg.financial_records (
        id, tenant_id, client_id, customer_name, amount, transaction_date,
        transaction_type, document_type, clase_de_documento,
        nit_dui, codigo_generacion, sello_recepcion,
        iva_amount, retention_amount, retention_percentage,
        afp_amount, isss_amount, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""


# ── Loaders por archivo ───────────────────────────────────────────────────────

def _load_contribuyentes(duck_con, rows: list[dict]) -> int:
    """F07_ANEXO_CONTRIBUYENTES → Ventas Contribuyente (B2B)"""
    records = []
    for i, r in enumerate(rows, 1):
        try:
            amount = _parse_decimal(r.get("VENTAS GRAVADAS LOCALES", "0"))
            iva = _parse_decimal(r.get("DEBITO FISCAL", "0"))
            nit = r.get("NIT O NRC DEL CLIENTE", "").strip() or "DESCONOCIDO"
            clase = _norm_clase_doc(r.get("CLASE DE DOCUMENTO", "1"))
            tipo = _norm_tipo_doc(r.get("TIPO DE DOCUMENTO", "03"))
            # Búsqueda robusta de la clave FECHA (inmune a variantes de encoding/BOM)
            fecha_raw = next((v for k, v in r.items() if "FECHA" in k.upper() and "EMISI" in k.upper()), "")
            fecha = _parse_date(fecha_raw)
            _validate_iva(amount, iva, f"CONTRIBUYENTES row={i} nit={nit}")
            name = next((v for k, v in r.items() if "NOMBRE" in k.upper() and "CLIENTE" in k.upper()), "DESCONOCIDO")
            records.append(_make_record(
                client_id=nit, customer_name=name, amount=amount, transaction_date=fecha,
                transaction_type="Ventas Contribuyente", document_type=tipo,
                clase_de_documento=clase, nit_dui=nit, iva_amount=iva,
            ))
        except Exception as e:
            logger.error("CONTRIBUYENTES row=%d error: %s | data=%s", i, e, r)
    if records:
        duck_con.executemany(_INSERT_SQL, records)
    logger.info("[SEEDER] Contribuyentes: %d registros insertados", len(records))
    return len(records)


def _load_consumidor_final(duck_con, rows: list[dict]) -> int:
    """F07_ANEXO_CONSUMIDOR_FINAL → Ventas Consumidor (B2C)"""
    records = []
    for i, r in enumerate(rows, 1):
        try:
            amount = _parse_decimal(r.get("VENTAS GRAVADAS LOCALES", "0"))
            iva = round(amount * IVA_RATE, 2)
            # Rango de documentos como identificador de lote
            doc_desde = r.get("N\u00daMERO DE DOCUMENTO (DEL)", "") or r.get("NUMERO DE DOCUMENTO (DEL)", "")
            doc_hasta = r.get("N\u00daMERO DE DOCUMENTO (AL)", "") or r.get("NUMERO DE DOCUMENTO (AL)", "")
            rango = f"{doc_desde.strip()}-{doc_hasta.strip()}"
            clase = _norm_clase_doc(r.get("CLASE DE DOCUMENTO", "1"))
            tipo = _norm_tipo_doc(r.get("TIPO DE DOCUMENTO", "01"))
            fecha_raw = next((v for k, v in r.items() if "FECHA" in k.upper() and "EMISI" in k.upper()), "")
            fecha = _parse_date(fecha_raw)
            records.append(_make_record(
                client_id="CONSUMIDOR_FINAL", customer_name="CONSUMIDOR FINAL", amount=amount, transaction_date=fecha,
                transaction_type="Ventas Consumidor", document_type=tipo,
                clase_de_documento=clase, nit_dui=rango, iva_amount=iva,
            ))
        except Exception as e:
            logger.error("CONSUMIDOR_FINAL row=%d error: %s | data=%s", i, e, r)
    if records:
        duck_con.executemany(_INSERT_SQL, records)
    logger.info("[SEEDER] Consumidor Final: %d registros insertados", len(records))
    return len(records)


def _load_compras(duck_con, rows: list[dict]) -> int:
    """F07_ANEXO_COMPRAS → Compras"""
    records = []
    for i, r in enumerate(rows, 1):
        try:
            amount = _parse_decimal(r.get("COMPRAS INTERNAS GRAVADAS", "0"))
            # Búsqueda robusta: 'CRÉDITO FISCAL' puede tener variantes de encoding
            iva_key = next((k for k in r if "DITO" in k.upper() and "FISC" in k.upper()), "")
            iva = _parse_decimal(r.get(iva_key, "0"))
            nit = r.get("NIT O NRC DEL PROVEEDOR", "").strip() or "DESCONOCIDO"
            clase = _norm_clase_doc(r.get("CLASE DE DOCUMENTO", "1"))
            tipo = _norm_tipo_doc(r.get("TIPO DE DOCUMENTO", "03"))
            fecha_raw = next((v for k, v in r.items() if "FECHA" in k.upper() and "EMISI" in k.upper()), "")
            fecha = _parse_date(fecha_raw)
            _validate_iva(amount, iva, f"COMPRAS row={i} nit={nit}")
            name = next((v for k, v in r.items() if "NOMBRE" in k.upper() and "PROVEEDOR" in k.upper()), "DESCONOCIDO")
            records.append(_make_record(
                client_id=nit, customer_name=name, amount=amount, transaction_date=fecha,
                transaction_type="Compras", document_type=tipo,
                clase_de_documento=clase, nit_dui=nit, iva_amount=iva,
            ))
        except Exception as e:
            logger.error("COMPRAS row=%d error: %s | data=%s", i, e, r)
    if records:
        duck_con.executemany(_INSERT_SQL, records)
    logger.info("[SEEDER] Compras: %d registros insertados", len(records))
    return len(records)


def _load_casilla_66(duck_con, rows: list[dict]) -> int:
    """F07_CASILLA_66 → Sujetos Excluidos (Retención IVA 13%)"""
    records = []
    for i, r in enumerate(rows, 1):
        try:
            # Búsqueda robusta: 'MONTO DE LA OPERACIÓN' puede tener variantes de encoding
            amount_key = next((k for k in r if "MONTO" in k.upper() and "OPERACI" in k.upper()), "")
            amount = _parse_decimal(r.get(amount_key, "0"))
            # Búsqueda robusta: 'MONTO DE LA RETENCIÓN DEL IVA 13%'
            ret_key = next((k for k in r if "RETENCI" in k.upper() and "IVA" in k.upper()), "")
            retention = _parse_decimal(r.get(ret_key, "0"))
            # Validar que retención ≈ monto × 13%
            expected_ret = round(amount * IVA_RATE, 2)
            if abs(retention - expected_ret) > IVA_TOLERANCE:
                logger.warning(
                    "[RETENCION-AUDIT] CASILLA_66 row=%d amount=%.2f expected_ret=%.2f got=%.2f",
                    i, amount, expected_ret, retention,
                )
            nit_key = (
                "N\u00daMERO DE NIT, DUI U OTRO DOCUMENTO" if
                "N\u00daMERO DE NIT, DUI U OTRO DOCUMENTO" in r
                else next((k for k in r if "NIT" in k.upper() and "N" in k), "")
            )
            nit = r.get(nit_key, "").strip() or "DESCONOCIDO"
            fecha_raw = next((v for k, v in r.items() if "FECHA" in k.upper() and "EMISI" in k.upper()), "")
            fecha = _parse_date(fecha_raw)
            name = next((v for k, v in r.items() if "NOMBRE" in k.upper()), "DESCONOCIDO")
            records.append(_make_record(
                client_id=nit, customer_name=name, amount=amount, transaction_date=fecha,
                transaction_type="Sujetos Excluidos", document_type="SE",
                clase_de_documento="1", nit_dui=nit,
                iva_amount=0.0, retention_amount=retention, retention_percentage=13.0,
            ))
        except Exception as e:
            logger.error("CASILLA_66 row=%d error: %s | data=%s", i, e, r)
    if records:
        duck_con.executemany(_INSERT_SQL, records)
    logger.info("[SEEDER] Casilla 66: %d registros insertados", len(records))
    return len(records)


def _apply_detalle_documentos(duck_con, rows: list[dict]) -> int:
    """
    F07_DETALLE_DOCUMENTOS — NO inserta registros.
    Actualiza status de documentos ya insertados según rango numérico.
    Regla: TIPO_DETALLE 'A' → Anulado/Invalidado con amount=0.
    """
    updated = 0
    for i, r in enumerate(rows, 1):
        try:
            tipo_detalle = r.get("TIPO DE DETALLE", "").upper()
            tipo_doc_raw = r.get("TIPO DE DOCUMENTO", "")
            tipo_doc = _norm_tipo_doc(tipo_doc_raw)
            serie = r.get("N\u00daMERO DE SERIE DEL DOCUMENTO", "") or r.get("NUMERO DE SERIE DEL DOCUMENTO", "") or \
                    r.get("N\u00b0SERIE", "") or r.get("N°SERIE", "")
            desde_raw = r.get("DESDE", "").strip()
            hasta_raw = r.get("HASTA", "").strip()
            codigo_gen = r.get("C\u00d3DIGO DE GENERACI\u00d3N", "") or r.get("CODIGO DE GENERACION", "")

            if "A" in tipo_detalle and "ANULADO" in tipo_detalle or "INVALIDADO" in tipo_detalle:
                new_status = "Anulado"
            elif "B" in tipo_detalle:
                new_status = "Extraviado"
            else:
                new_status = "Anulado"  # default para tipo A

            # Si hay código de generación exacto, cruzar por UUID
            if codigo_gen and len(codigo_gen) > 10:
                result = duck_con.execute(
                    """UPDATE pg.financial_records
                       SET status = ?, amount = 0.00, iva_amount = 0.00, retention_amount = 0.00
                       WHERE tenant_id = ? AND codigo_generacion = ?""",
                    [new_status, TENANT_ID, codigo_gen],
                )
                updated += 1
                continue

            # Cruzar por tipo_doc + rango numérico de documento
            if desde_raw.isdigit() and hasta_raw.isdigit():
                num_desde = int(desde_raw)
                num_hasta = int(hasta_raw)
                # Generar lista de números en el rango para el UPDATE
                nums = [str(n).zfill(len(desde_raw)) for n in range(num_desde, num_hasta + 1)]
                for num in nums:
                    duck_con.execute(
                        """UPDATE pg.financial_records
                           SET status = ?, amount = 0.00, iva_amount = 0.00, retention_amount = 0.00
                           WHERE tenant_id = ? AND document_type = ?
                             AND nit_dui LIKE ?""",
                        [new_status, TENANT_ID, tipo_doc, f"%{num}%"],
                    )
                updated += len(nums)
            else:
                logger.warning("DETALLE_DOCUMENTOS row=%d sin rango numérico válido: %r-%r", i, desde_raw, hasta_raw)
        except Exception as e:
            logger.error("DETALLE_DOCUMENTOS row=%d error: %s | data=%s", i, e, r)

    logger.info("[SEEDER] Detalle Documentos: ~%d registros actualizados a status Anulado/Extraviado", updated)
    return updated


def _load_nomina(duck_con, renta_rows: list[dict], q25_rows: list[dict]) -> int:
    """
    F14_ANEXO_RENTA + F14_ANEXO_Q25 → Gastos Nomina
    Join por NIT/NIF + PERIODO para obtener fecha de pago y salario nominal.
    retention_amount = ISR (Impuesto sobre la Renta retenido)
    afp_amount = AFP
    isss_amount = ISSS
    """
    # Construir índice Q25 por NIT+PERIODO
    q25_index: dict[str, dict] = {}
    for r in q25_rows:
        nit = r.get("NIT/NIF", "").strip()
        periodo = r.get("PERIODO", "").strip()
        key = f"{nit}|{periodo}"
        q25_index[key] = r

    records = []
    for i, r in enumerate(renta_rows, 1):
        try:
            nit = r.get("NIT/NIF", "").strip() or r.get("NIT/NIF ", "").strip()
            periodo = r.get("PERIODO", "").strip()
            nombre = r.get(
                "APELLIDOS NOMBRES RAZON O DENOMINACI\u00d3N SOCIAL",
                r.get("APELLIDOS NOMBRES RAZON O DENOMINACION SOCIAL", f"EMPLEADO_{i}")
            ).strip()

            amount = _parse_decimal(r.get("MONTO DEVENGADO", "0"))
            isr = _parse_decimal(r.get("IMPUESTO RETENIDO", "0"))
            afp = _parse_decimal(r.get("AFP", "0"))
            isss = _parse_decimal(r.get("ISSS", "0"))

            # Fecha de pago desde Q25; fallback al primer día del periodo
            q25 = q25_index.get(f"{nit}|{periodo}")
            if q25:
                fecha = _parse_date(q25.get("FECHA DE PAGO", ""))
            else:
                fecha = _parse_date(periodo) if periodo else date.today()

            records.append(_make_record(
                client_id=nombre, customer_name=nombre, amount=amount, transaction_date=fecha,
                transaction_type="Gastos Nomina", document_type="F14",
                clase_de_documento="1", nit_dui=nit or "N/A",
                iva_amount=0.0,
                retention_amount=round(isr, 2),
                retention_percentage=round((isr / amount * 100), 2) if amount > 0 else 0.0,
                afp_amount=round(afp, 2),
                isss_amount=round(isss, 2),
            ))
        except Exception as e:
            logger.error("NOMINA row=%d error: %s | data=%s", i, e, r)

    if records:
        duck_con.executemany(_INSERT_SQL, records)

    # Log resumen de nómina
    total_isr = sum(r[12] for r in records)
    total_afp = sum(r[14] for r in records)
    total_isss = sum(r[15] for r in records)
    logger.info(
        "[SEEDER] Nómina: %d empleados | ISR=%.2f | AFP=%.2f | ISSS=%.2f",
        len(records), total_isr, total_afp, total_isss,
    )
    return len(records)


# ── Extracción segura del ZIP ─────────────────────────────────────────────────

def extract_zip_safely(zip_path: Path, temp_dir: Path) -> dict[str, bytes]:
    """
    Descomprime el ZIP validando:
    1. Whitelist de nombres de archivo
    2. Anti path-traversal (no '../' en ningún miembro)
    3. Límite de tamaño por archivo
    Retorna dict {filename: bytes}
    """
    extracted: dict[str, bytes] = {}
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.infolist():
            name = Path(member.filename).name  # solo el basename
            # Anti path-traversal
            if ".." in member.filename or member.filename.startswith("/"):
                logger.error("[SECURITY] Path-traversal detectado en ZIP: %s — ignorado", member.filename)
                continue
            # Whitelist
            if name not in ALLOWED_FILES:
                logger.warning("[SECURITY] Archivo no permitido en ZIP: %s — ignorado", name)
                continue
            # Tamaño
            if member.file_size > MAX_FILE_BYTES:
                raise ValueError(f"Archivo {name} supera el límite de tamaño")
            extracted[name] = zf.read(member.filename)
            logger.debug("[ZIP] Extraído en memoria: %s (%d bytes)", name, len(extracted[name]))
    return extracted


def cleanup_temp(temp_dir: Path) -> None:
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
        logger.info("[SEEDER] Directorio temporal eliminado: %s", temp_dir)


# ── Orquestador principal ─────────────────────────────────────────────────────

def init_seeded_duckdb(duck_con, zip_path: Path) -> dict[str, Any]:
    """
    Punto de entrada principal. Carga todos los CSV en DuckDB y retorna
    un resumen de registros insertados/actualizados.
    """
    logger.info("[SEEDER] Iniciando carga de datos estructurados desde: %s", zip_path)

    # Extracción en memoria (sin escribir a disco)
    temp_dir = zip_path.parent / ".temp_csvs"
    temp_dir.mkdir(exist_ok=True)

    try:
        file_bytes = extract_zip_safely(zip_path, temp_dir)

        def get_rows(filename: str) -> list[dict]:
            if filename not in file_bytes:
                logger.error("[SEEDER] Archivo no encontrado en ZIP: %s", filename)
                return []
            return _read_csv_secure(file_bytes[filename], filename)

        # ── Carga secuencial ──────────────────────────────────────────────────
        n_contrib = _load_contribuyentes(duck_con, get_rows("F07_ANEXO_CONTRIBUYENTES.csv"))
        n_consumidor = _load_consumidor_final(duck_con, get_rows("F07_ANEXO_CONSUMIDOR_FINAL.csv"))
        n_compras = _load_compras(duck_con, get_rows("F07_ANEXO_COMPRAS.csv"))
        n_casilla = _load_casilla_66(duck_con, get_rows("F07_CASILLA_66.csv"))
        n_nomina = _load_nomina(
            duck_con,
            get_rows("F14_ANEXO_RENTA.csv"),
            get_rows("F14_ANEXO_Q25.csv"),
        )
        n_anulados = _apply_detalle_documentos(duck_con, get_rows("F07_DETALLE_DOCUMENTOS.csv"))

        total_inserts = n_contrib + n_consumidor + n_compras + n_casilla + n_nomina

        # ── Queries de auditoría post-carga ───────────────────────────────────
        _run_audit_queries(duck_con)

        summary = {
            "contribuyentes": n_contrib,
            "consumidor_final": n_consumidor,
            "compras": n_compras,
            "sujetos_excluidos": n_casilla,
            "nomina": n_nomina,
            "total_inserts": total_inserts,
            "documentos_anulados_actualizados": n_anulados,
        }
        logger.info("[SEEDER] Carga completada: %s", summary)
        return summary

    finally:
        cleanup_temp(temp_dir)


def _run_audit_queries(duck_con) -> None:
    """Ejecuta y loggea queries de verificación matemática post-carga."""
    logger.info("=" * 60)
    logger.info("[AUDIT] ── Resumen por tipo de transacción (tenant_A) ──")
    try:
        rows = duck_con.execute("""
            SELECT transaction_type,
                   COUNT(*)            AS registros,
                   SUM(amount)         AS total_amount,
                   SUM(iva_amount)     AS total_iva,
                   SUM(retention_amount) AS total_retencion,
                   SUM(afp_amount)     AS total_afp,
                   SUM(isss_amount)    AS total_isss
            FROM pg.financial_records
            WHERE tenant_id = 'tenant_A'
            GROUP BY transaction_type
            ORDER BY transaction_type
        """).fetchall()
        for r in rows:
            logger.info(
                "  %-22s | n=%3d | amount=%10.2f | IVA=%8.2f | ISR=%7.2f | AFP=%6.2f | ISSS=%6.2f",
                *r,
            )
    except Exception as e:
        logger.error("[AUDIT] Error en resumen: %s", e)

    logger.info("[AUDIT] ── Validación IVA Contribuyentes (delta máximo) ──")
    try:
        row = duck_con.execute("""
            SELECT MAX(ABS(iva_amount - amount * 0.13)) AS max_delta
            FROM pg.financial_records
            WHERE tenant_id = 'tenant_A'
              AND transaction_type = 'Ventas Contribuyente'
              AND status = 'Valido'
        """).fetchone()
        logger.info("  Max delta IVA vs 13%%: %.4f", row[0] or 0)
    except Exception as e:
        logger.error("[AUDIT] Error en validación IVA: %s", e)

    logger.info("[AUDIT] ── Documentos por status ──")
    try:
        rows = duck_con.execute("""
            SELECT status, COUNT(*) AS n
            FROM pg.financial_records
            WHERE tenant_id = 'tenant_A'
            GROUP BY status
        """).fetchall()
        for r in rows:
            logger.info("  %-12s : %d", r[0], r[1])
    except Exception as e:
        logger.error("[AUDIT] Error en status: %s", e)

    logger.info("[AUDIT] ── Total Retenciones Casilla 66 ──")
    try:
        row = duck_con.execute("""
            SELECT SUM(retention_amount)
            FROM pg.financial_records
            WHERE tenant_id = 'tenant_A'
              AND transaction_type = 'Sujetos Excluidos'
        """).fetchone()
        logger.info("  Total retenciones 13%%: %.2f", row[0] or 0)
    except Exception as e:
        logger.error("[AUDIT] Error en retenciones: %s", e)

    logger.info("=" * 60)
