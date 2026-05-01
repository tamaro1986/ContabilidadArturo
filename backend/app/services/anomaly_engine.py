"""
anomaly_engine.py — Motor de Detección de Anomalías Tributarias.

Implementa una simulación de Isolation Forest usando reglas financieras
derivadas del esquema DuckDB de financial_records.

Reglas implementadas (en orden de prioridad):
  1. RETENCIÓN_INCONGRUENTE: Retención 13% aplicada en registros que NO son
     Sujetos Excluidos (o viceversa: transacción Sujetos Excluidos sin retención 13%).
  2. MONTO_OUTLIER: Factura cuyo monto supera 5× la media del mismo tipo de transacción.
  3. PATRÓN_TEMPORAL: Múltiples documentos del mismo cliente en un mismo día
     (≥5 registros en 24h → posible fragmentación para evadir umbrales).
  4. IVA_INCONSISTENTE: Delta entre IVA declarado y 13% del monto > $5.00 (en transacciones válidas).
  5. RETENCIÓN_DOBLE: Registro con retention_percentage ≥ 2 tipos distintos a la vez
     (p.ej. 1% Y 13% en el mismo documento).

Estrategia de marcado:
  - Se ejecuta DESPUÉS de insertar datos en DuckDB (post-seeder).
  - Actualiza is_anomalous = TRUE y anomaly_reason en los registros detectados.
  - Objetivo: 2%–5% de registros anómalos sobre el total válido.
  - Multi-tenant safe: siempre filtra por tenant_id.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── Constantes de detección ────────────────────────────────────────────────────

# Factor de outlier: monto > (media * OUTLIER_SIGMA) del mismo transaction_type
OUTLIER_FACTOR = 5.0

# Mínimo delta aceptable entre IVA declarado y 13% del monto (en USD)
IVA_DELTA_THRESHOLD = 5.00

# Número mínimo de documentos por cliente en un día para sospechar fragmentación
FRAGMENTATION_THRESHOLD = 5

# Razones codificadas para la UI (en español de negocios)
REASON_RETENTION_INCONGRUENT = (
    "Retención IVA 13% incongruente con el tipo de transacción. "
    "Verificar si el proveedor califica como Sujeto Excluido."
)
REASON_AMOUNT_OUTLIER = (
    "Monto atípico: supera 5× el promedio del período para este tipo de operación. "
    "Posible error de captura o transacción no ordinaria."
)
REASON_TEMPORAL_FRAGMENTATION = (
    "Patrón de fragmentación detectado: 5 o más documentos del mismo emisor "
    "en el mismo día calendario. Revisar posible evasión de umbrales de reporte."
)
REASON_IVA_INCONSISTENT = (
    "IVA declarado difiere en más de $5.00 respecto al cálculo teórico (13% del monto). "
    "Posible error aritmético o tipificación incorrecta de la operación."
)
REASON_DOUBLE_RETENTION = (
    "Retención múltiple detectada: el documento registra porcentajes de retención "
    "fuera del rango estándar (1%, 2% o 13%). Validar la obligación tributaria aplicable."
)


# ── Función principal ──────────────────────────────────────────────────────────

def run_anomaly_detection(duck_con, tenant_id: str) -> dict[str, Any]:
    """
    Ejecuta el pipeline completo de detección de anomalías para un tenant.
    
    Pasos:
    1. Asegura que las columnas is_anomalous / anomaly_reason existen.
    2. Resetea flags anteriores para el tenant (idempotente).
    3. Aplica cada regla de detección en secuencia.
    4. Retorna un resumen de registros afectados.
    
    Seguridad:
    - Usa parámetros ? para todo tenant_id (sin interpolación de strings).
    - Nunca modifica registros de otros tenants.
    """
    logger.info("[ANOMALY] Iniciando detección para tenant=%s", tenant_id)

    # ── Paso 1: Migración de esquema (idempotente) ─────────────────────────────
    _ensure_anomaly_columns(duck_con)

    # ── Paso 2: Reset de flags anteriores ─────────────────────────────────────
    duck_con.execute(
        "UPDATE pg.financial_records SET is_anomalous = FALSE, anomaly_reason = NULL "
        "WHERE tenant_id = ?",
        [tenant_id],
    )
    logger.info("[ANOMALY] Flags reseteados para tenant=%s", tenant_id)

    counts = {}

    # ── Paso 3: Aplicar reglas de detección ───────────────────────────────────
    counts["retención_incongruente"] = _rule_retention_incongruent(duck_con, tenant_id)
    counts["monto_outlier"] = _rule_amount_outlier(duck_con, tenant_id)
    counts["fragmentación_temporal"] = _rule_temporal_fragmentation(duck_con, tenant_id)
    counts["iva_inconsistente"] = _rule_iva_inconsistent(duck_con, tenant_id)
    counts["retención_doble"] = _rule_double_retention(duck_con, tenant_id)

    # ── Paso 4: Estadísticas finales ──────────────────────────────────────────
    total_anomalous = duck_con.execute(
        "SELECT COUNT(*) FROM pg.financial_records WHERE tenant_id = ? AND is_anomalous = TRUE",
        [tenant_id],
    ).fetchone()[0]

    total_records = duck_con.execute(
        "SELECT COUNT(*) FROM pg.financial_records WHERE tenant_id = ? AND status = 'Valido'",
        [tenant_id],
    ).fetchone()[0]

    anomaly_rate = round((total_anomalous / total_records * 100), 2) if total_records > 0 else 0.0

    summary = {
        "tenant_id": tenant_id,
        "total_records_scanned": total_records,
        "total_anomalous": total_anomalous,
        "anomaly_rate_pct": anomaly_rate,
        "breakdown": counts,
    }
    logger.info("[ANOMALY] Detección completada: %s", summary)
    return summary


# ── Migración de esquema ───────────────────────────────────────────────────────

def _ensure_anomaly_columns(duck_con) -> None:
    """
    Agrega is_anomalous y anomaly_reason si no existen (idempotente).
    DuckDB no soporta ADD COLUMN IF NOT EXISTS directamente,
    así que usamos un bloque try/except por columna.
    """
    for sql in [
        "ALTER TABLE pg.financial_records ADD COLUMN is_anomalous BOOLEAN DEFAULT FALSE",
        "ALTER TABLE pg.financial_records ADD COLUMN anomaly_reason VARCHAR",
    ]:
        try:
            duck_con.execute(sql)
            logger.info("[ANOMALY] Columna añadida: %s", sql.split("ADD COLUMN")[1].strip().split()[0])
        except Exception:
            pass  # La columna ya existe — comportamiento esperado en re-ejecuciones


# ── Reglas de Detección ────────────────────────────────────────────────────────

def _rule_retention_incongruent(duck_con, tenant_id: str) -> int:
    """
    Regla 1: Retención 13% en registros que NO son Sujetos Excluidos,
    O Sujetos Excluidos con retención_percentage ≠ 13%.
    """
    # Caso A: Retención 13% en tipo que no corresponde
    result_a = duck_con.execute(
        """
        UPDATE pg.financial_records
        SET is_anomalous = TRUE,
            anomaly_reason = ?
        WHERE tenant_id = ?
          AND status = 'Valido'
          AND retention_percentage = 13
          AND transaction_type NOT IN ('Sujetos Excluidos')
        """,
        [REASON_RETENTION_INCONGRUENT, tenant_id],
    )
    count_a = duck_con.execute(
        """SELECT COUNT(*) FROM pg.financial_records
           WHERE tenant_id = ? AND status = 'Valido'
             AND is_anomalous = TRUE AND anomaly_reason = ?""",
        [tenant_id, REASON_RETENTION_INCONGRUENT],
    ).fetchone()[0]

    # Caso B: Sujetos Excluidos sin retención 13%
    duck_con.execute(
        """
        UPDATE pg.financial_records
        SET is_anomalous = TRUE,
            anomaly_reason = ?
        WHERE tenant_id = ?
          AND status = 'Valido'
          AND transaction_type = 'Sujetos Excluidos'
          AND (retention_percentage IS NULL OR retention_percentage != 13)
          AND is_anomalous = FALSE
        """,
        [REASON_RETENTION_INCONGRUENT, tenant_id],
    )

    total = duck_con.execute(
        "SELECT COUNT(*) FROM pg.financial_records WHERE tenant_id = ? AND status = 'Valido' AND is_anomalous = TRUE AND anomaly_reason = ?",
        [tenant_id, REASON_RETENTION_INCONGRUENT],
    ).fetchone()[0]

    logger.info("[ANOMALY] Retención incongruente: %d registros", total)
    return total


def _rule_amount_outlier(duck_con, tenant_id: str) -> int:
    """
    Regla 2: Monto > OUTLIER_FACTOR × promedio del mismo tipo de transacción.
    Excluye registros ya marcados.
    """
    duck_con.execute(
        f"""
        UPDATE pg.financial_records AS fr
        SET is_anomalous = TRUE,
            anomaly_reason = ?
        WHERE fr.tenant_id = ?
          AND fr.status = 'Valido'
          AND fr.is_anomalous = FALSE
          AND fr.amount > (
              SELECT AVG(sub.amount) * {OUTLIER_FACTOR}
              FROM pg.financial_records sub
              WHERE sub.tenant_id = fr.tenant_id
                AND sub.transaction_type = fr.transaction_type
                AND sub.status = 'Valido'
                AND sub.amount > 0
          )
          AND fr.amount > 0
        """,
        [REASON_AMOUNT_OUTLIER, tenant_id],
    )

    total = duck_con.execute(
        "SELECT COUNT(*) FROM pg.financial_records WHERE tenant_id = ? AND anomaly_reason = ?",
        [tenant_id, REASON_AMOUNT_OUTLIER],
    ).fetchone()[0]
    logger.info("[ANOMALY] Monto outlier: %d registros", total)
    return total


def _rule_temporal_fragmentation(duck_con, tenant_id: str) -> int:
    """
    Regla 3: >= FRAGMENTATION_THRESHOLD documentos del mismo client_id
    en el mismo día. Marca TODOS los registros de ese grupo.
    """
    duck_con.execute(
        f"""
        UPDATE pg.financial_records
        SET is_anomalous = TRUE,
            anomaly_reason = ?
        WHERE tenant_id = ?
          AND status = 'Valido'
          AND is_anomalous = FALSE
          AND (client_id, transaction_date) IN (
              SELECT client_id, transaction_date
              FROM pg.financial_records
              WHERE tenant_id = ?
                AND status = 'Valido'
              GROUP BY client_id, transaction_date
              HAVING COUNT(*) >= {FRAGMENTATION_THRESHOLD}
          )
        """,
        [REASON_TEMPORAL_FRAGMENTATION, tenant_id, tenant_id],
    )

    total = duck_con.execute(
        "SELECT COUNT(*) FROM pg.financial_records WHERE tenant_id = ? AND anomaly_reason = ?",
        [tenant_id, REASON_TEMPORAL_FRAGMENTATION],
    ).fetchone()[0]
    logger.info("[ANOMALY] Fragmentación temporal: %d registros", total)
    return total


def _rule_iva_inconsistent(duck_con, tenant_id: str) -> int:
    """
    Regla 4: |iva_amount − amount × 0.13| > IVA_DELTA_THRESHOLD en ventas/compras.
    """
    duck_con.execute(
        f"""
        UPDATE pg.financial_records
        SET is_anomalous = TRUE,
            anomaly_reason = ?
        WHERE tenant_id = ?
          AND status = 'Valido'
          AND is_anomalous = FALSE
          AND transaction_type IN (
              'Ventas Contribuyente', 'Ventas Consumidor', 'Compras'
          )
          AND amount > 0
          AND iva_amount > 0
          AND ABS(iva_amount - amount * 0.13) > {IVA_DELTA_THRESHOLD}
        """,
        [REASON_IVA_INCONSISTENT, tenant_id],
    )

    total = duck_con.execute(
        "SELECT COUNT(*) FROM pg.financial_records WHERE tenant_id = ? AND anomaly_reason = ?",
        [tenant_id, REASON_IVA_INCONSISTENT],
    ).fetchone()[0]
    logger.info("[ANOMALY] IVA inconsistente: %d registros", total)
    return total


def _rule_double_retention(duck_con, tenant_id: str) -> int:
    """
    Regla 5: retention_percentage fuera de los valores estándar:
    0, 1, 2, 13. Cualquier otro valor es sospechoso.
    """
    duck_con.execute(
        """
        UPDATE pg.financial_records
        SET is_anomalous = TRUE,
            anomaly_reason = ?
        WHERE tenant_id = ?
          AND status = 'Valido'
          AND is_anomalous = FALSE
          AND retention_percentage > 0
          AND retention_percentage NOT IN (1.00, 2.00, 13.00)
        """,
        [REASON_DOUBLE_RETENTION, tenant_id],
    )

    total = duck_con.execute(
        "SELECT COUNT(*) FROM pg.financial_records WHERE tenant_id = ? AND anomaly_reason = ?",
        [tenant_id, REASON_DOUBLE_RETENTION],
    ).fetchone()[0]
    logger.info("[ANOMALY] Retención doble/irregular: %d registros", total)
    return total


# ── Función de consulta (para el endpoint) ────────────────────────────────────

def get_anomalies(
    duck_con,
    tenant_id: str,
    limit: int = 100,
    offset: int = 0,
) -> dict[str, Any]:
    """
    Retorna los registros anómalos paginados para el endpoint REST.
    Ejecuta el motor si no hay anomalías marcadas aún (lazy init).
    """
    # Verificar si las columnas existen y hay datos marcados
    _ensure_anomaly_columns(duck_con)

    count_existing = duck_con.execute(
        "SELECT COUNT(*) FROM pg.financial_records WHERE tenant_id = ? AND is_anomalous = TRUE",
        [tenant_id],
    ).fetchone()[0]

    if count_existing == 0:
        # Primera llamada: ejecutar el motor
        run_anomaly_detection(duck_con, tenant_id)

    # Consulta paginada de anomalías
    rows = duck_con.execute(
        """
        SELECT
            id,
            client_id,
            customer_name,
            amount,
            CAST(transaction_date AS VARCHAR) AS transaction_date,
            transaction_type,
            document_type,
            nit_dui,
            iva_amount,
            retention_amount,
            retention_percentage,
            anomaly_reason,
            status
        FROM pg.financial_records
        WHERE tenant_id = ?
          AND is_anomalous = TRUE
        ORDER BY amount DESC
        LIMIT ? OFFSET ?
        """,
        [tenant_id, limit, offset],
    ).fetchall()

    columns = [
        "id", "client_id", "customer_name", "amount", "transaction_date",
        "transaction_type", "document_type", "nit_dui", "iva_amount",
        "retention_amount", "retention_percentage", "anomaly_reason", "status",
    ]

    total = duck_con.execute(
        "SELECT COUNT(*) FROM pg.financial_records WHERE tenant_id = ? AND is_anomalous = TRUE",
        [tenant_id],
    ).fetchone()[0]

    data = [dict(zip(columns, row)) for row in rows]

    # Enriquecer con nivel de riesgo (para la UI)
    for item in data:
        item["risk_level"] = _classify_risk(item)
        item["amount"] = float(item["amount"] or 0)
        item["iva_amount"] = float(item["iva_amount"] or 0)
        item["retention_amount"] = float(item["retention_amount"] or 0)
        item["retention_percentage"] = float(item["retention_percentage"] or 0)

    return {
        "status": "success",
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": data,
    }


def _classify_risk(record: dict) -> str:
    """
    Clasifica el nivel de riesgo de un registro anómalo para la UI.
    Retorna: 'ALTO', 'MEDIO', 'BAJO'
    """
    reason = record.get("anomaly_reason", "")
    amount = float(record.get("amount") or 0)

    if REASON_TEMPORAL_FRAGMENTATION in reason or REASON_RETENTION_INCONGRUENT in reason:
        return "ALTO"
    if amount > 10_000 and REASON_AMOUNT_OUTLIER in reason:
        return "ALTO"
    if REASON_AMOUNT_OUTLIER in reason or REASON_IVA_INCONSISTENT in reason:
        return "MEDIO"
    return "BAJO"
