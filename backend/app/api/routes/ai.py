"""
ai.py — Endpoint de IA para Detección de Anomalías Tributarias.
Ruta base: /api/v1/ai/

Endpoints:
  GET /anomalies          — Lista anomalías paginadas (lazy init del motor)
  POST /anomalies/refresh — Fuerza re-ejecución del motor de detección
  GET /anomalies/summary  — Estadísticas agregadas del último escaneo
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from app.api.dependencies.roles import require_cliente
from app.services.duckdb_client import get_duckdb_client
from app.services.anomaly_engine import get_anomalies, run_anomaly_detection

router = APIRouter()


@router.get("/anomalies")
def list_anomalies(
    limit: int = Query(default=50, ge=1, le=200, description="Registros por página"),
    offset: int = Query(default=0, ge=0, description="Desplazamiento de paginación"),
    user_data: dict = Depends(require_cliente),
    duck_con=Depends(get_duckdb_client),
):
    """
    Retorna los registros tributarios marcados como anómalos para el tenant
    autenticado. Inicializa el motor de detección en la primera llamada (lazy init).

    Parámetros:
    - limit: número de registros (máx. 200)
    - offset: paginación basada en cursor numérico

    Respuesta:
    - data[]: lista de registros con anomaly_reason, risk_level, montos
    - total: total de anomalías detectadas
    - anomaly_rate_pct: porcentaje sobre el total de registros válidos
    """
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado en el token")

    try:
        result = get_anomalies(duck_con, tenant_id, limit=limit, offset=offset)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en el motor de detección de anomalías: {str(e)}",
        )


@router.post("/anomalies/refresh")
def refresh_anomalies(
    user_data: dict = Depends(require_cliente),
    duck_con=Depends(get_duckdb_client),
):
    """
    Fuerza una re-ejecución completa del motor de detección de anomalías.
    Útil después de importar nuevos datos o modificar el dataset.

    Respuesta:
    - summary: estadísticas del escaneo (total_anomalous, anomaly_rate_pct, breakdown por regla)
    """
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado en el token")

    try:
        summary = run_anomaly_detection(duck_con, tenant_id)
        return {"status": "success", "summary": summary}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al refrescar detección: {str(e)}",
        )


@router.get("/anomalies/summary")
def anomalies_summary(
    user_data: dict = Depends(require_cliente),
    duck_con=Depends(get_duckdb_client),
):
    """
    Retorna un resumen estadístico de las anomalías detectadas:
    - Desglose por tipo de regla (razón de anomalía)
    - Desglose por nivel de riesgo (ALTO / MEDIO / BAJO)
    - Top 3 clientes con más anomalías
    """
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado en el token")

    try:
        # Asegurar columnas y lazy init si hace falta
        from app.services.anomaly_engine import _ensure_anomaly_columns, get_anomalies
        _ensure_anomaly_columns(duck_con)

        count_check = duck_con.execute(
            "SELECT COUNT(*) FROM pg.financial_records WHERE tenant_id = ? AND is_anomalous = TRUE",
            [tenant_id],
        ).fetchone()[0]
        if count_check == 0:
            run_anomaly_detection(duck_con, tenant_id)

        # Desglose por razón
        reason_rows = duck_con.execute(
            """
            SELECT anomaly_reason, COUNT(*) as n, SUM(amount) as total_amount
            FROM pg.financial_records
            WHERE tenant_id = ? AND is_anomalous = TRUE
            GROUP BY anomaly_reason
            ORDER BY n DESC
            """,
            [tenant_id],
        ).fetchall()

        by_reason = [
            {
                "reason": row[0],
                "count": row[1],
                "total_amount": float(row[2] or 0),
            }
            for row in reason_rows
        ]

        # Top clientes anómalos
        top_clients_rows = duck_con.execute(
            """
            SELECT client_id, customer_name, COUNT(*) as anomalias, SUM(amount) as total
            FROM pg.financial_records
            WHERE tenant_id = ? AND is_anomalous = TRUE
            GROUP BY client_id, customer_name
            ORDER BY anomalias DESC
            LIMIT 5
            """,
            [tenant_id],
        ).fetchall()

        top_clients = [
            {
                "client_id": row[0],
                "customer_name": row[1],
                "anomaly_count": row[2],
                "total_amount": float(row[3] or 0),
            }
            for row in top_clients_rows
        ]

        # Totales
        totals = duck_con.execute(
            """
            SELECT
                COUNT(*) FILTER (WHERE is_anomalous = TRUE)        AS total_anomalous,
                COUNT(*) FILTER (WHERE status = 'Valido')          AS total_valid,
                SUM(amount) FILTER (WHERE is_anomalous = TRUE)     AS anomalous_amount
            FROM pg.financial_records
            WHERE tenant_id = ?
            """,
            [tenant_id],
        ).fetchone()

        total_anomalous = totals[0] or 0
        total_valid = totals[1] or 1  # evitar div/0
        anomalous_amount = float(totals[2] or 0)
        anomaly_rate = round(total_anomalous / total_valid * 100, 2)

        return {
            "status": "success",
            "data": {
                "total_anomalous": total_anomalous,
                "total_valid_records": total_valid,
                "anomaly_rate_pct": anomaly_rate,
                "anomalous_amount_total": anomalous_amount,
                "by_reason": by_reason,
                "top_anomalous_clients": top_clients,
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener resumen de anomalías: {str(e)}",
        )
