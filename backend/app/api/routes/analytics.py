from fastapi import APIRouter, Depends, HTTPException, status
from app.api.dependencies.roles import require_cliente, require_contador
from app.services.duckdb_client import get_duckdb_client
from app.services.cache import cache_response

router = APIRouter()

# ── Mapeo de Inteligencia de Clientes ──────────────────────────────────────────
# Esta es la única fuente de verdad para etiquetas, colores y narrativas.
# El frontend es "tonto" y solo renderiza lo que recibe de aquí.

SEGMENT_MAPPING = {
    "estrella": {
        "label": "Campeones",
        "color": "var(--color-secondary)",  # Official Stitch Green
        "insight": "Genera altos ingresos y nos compra constantemente."
    },
    "habituales": {
        "label": "Leales",
        "color": "var(--color-primary)",  # Official Stitch Dark Blue
        "insight": "Compra con regularidad. Una relación comercial estable y confiable."
    },
    "prometedores": {
        "label": "Leales",
        "color": "var(--color-warning)",  # Official Stitch Warning Amber
        "insight": "Cliente reciente con buen potencial de crecimiento."
    },
    "desarrollo": {
        "label": "Leales",
        "color": "var(--color-surface-tint)",  # Semantic Slate/Blue
        "insight": "Clientes con compras esporádicas; ideal para ofertas de frecuencia."
    },
    "atencion": {
        "label": "En Riesgo",
        "color": "var(--color-error)",  # Official Stitch Error Red
        "insight": "Solía comprar mucho, pero no lo ha hecho recientemente."
    }
}

@router.get("/years")
@cache_response(expire=3600)
def get_available_years(
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado")
    
    query = """
        SELECT DISTINCT EXTRACT('year' FROM transaction_date) as year_val
        FROM pg.public.financial_records
        WHERE tenant_id = ? AND transaction_date IS NOT NULL AND status = 'Valido'
        ORDER BY year_val DESC;
    """
    try:
        results = duck_con.execute(query, [tenant_id]).fetchall()
        years = [int(row[0]) for row in results if row[0] is not None]
        return {
            "status": "success",
            "data": years
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener años: {str(e)}")

@router.get("/rfm")
@cache_response(expire=3600)
def get_rfm_analysis(
    year: int = None,
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado")

    query = """
        WITH rfm_base AS (
            SELECT 
                client_id,
                MAX(customer_name) as customer_name,
                MAX(transaction_date) as last_pu            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
              AND transaction_type IN ('Ventas Contribuyente', 'Ventas Consumidor')
              AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
            GROUP BY client_id
        ),
        rfm_scores AS (
            SELECT 
                client_id,
                customer_name,
                last_purchase_date,
                frequency,
                monetary,
                NTILE(5) OVER (ORDER BY last_purchase_date ASC) AS r_score,
                NTILE(5) OVER (ORDER BY frequency ASC) AS f_score,
                NTILE(5) OVER (ORDER BY monetary ASC) AS m_score
            FROM rfm_base
        )
        SELECT 
            client_id,
            customer_name,
            CAST(last_purchase_date AS VARCHAR) as last_purchase,
            frequency,
            monetary,
            CASE 
                WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'estrella'
                WHEN r_score <= 2 THEN 'atencion'
                WHEN r_score >= 4 AND f_score <= 2 THEN 'prometedores'
                WHEN r_score >= 3 AND f_score >= 3 THEN 'habituales'
                ELSE 'desarrollo'
            END AS segment_key
        FROM rfm_scores
        ORDER BY monetary DESC;
    """
 
    try:
        results = duck_con.execute(query, [tenant_id, year, year]).fetchall()ary DESC;
    """

    try:
        results = duck_con.execute(query, [tenant_id]).fetchall()
        columns = [desc[0] for desc in duck_con.description]
        
        raw_data = [dict(zip(columns, row)) for row in results]
        
        # Mapeo final a lenguaje de negocio (Dumb UI Pattern)
        final_data = []
        summary_counts = {}
        
        for item in raw_data:
            key = item.pop("segment_key")
            mapping = SEGMENT_MAPPING.get(key, SEGMENT_MAPPING["desarrollo"])
            
            # Mapear campos del backend al formato esperado por el frontend
            final_item = {
                "id": item.get("client_id", ""),
                "nombre": item.get("customer_name", "DESCONOCIDO"),
                "giro": "",  # No disponible en datos fiscales
                "estado": mapping["label"],
                "gananciaHistorica": float(item.get("monetary", 0) or 0),
                "ticketPromedio": float(item.get("monetary", 0) or 0) / max(float(item.get("frequency", 1) or 1), 1),
                "tendenciaAnual": [],  # Se calculará en versión futura
                "insightIA": mapping["insight"],
                "historialFacturas": []
            }
            
            final_data.append(final_item)
            
            # Actualizar resumen para gráficos
            label = mapping["label"]
            summary_counts[label] = summary_counts.get(label, 0) + 1

        return {
            "status": "success",
            "data": final_data,
            "summary": [{"name": k, "value": v} for k, v in summary_counts.items()]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis DuckDB: {str(e)}")

@router.get("/monthly-customers")
@cache_response(expire=600)  # 10 min for mes actual
def get_monthly_customers(
    year: int = None,
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    """
    Retorna los clientes de ventas del mes en curso, ordenados por monto,
    con su segmento ya mapeado a etiquetas de negocio.
    """
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:        WITH latest_month AS (
            SELECT MAX(date_trunc('month', transaction_date)) as max_month
            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
              AND transaction_type IN ('Ventas Contribuyente', 'Ventas Consumidor')
              AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
        ),
        monthly_sales AS (
            SELECT 
                client_id,
                MAX(customer_name) as customer_name,
                SUM(amount) as monto_mes
            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
              AND transaction_type IN ('Ventas Contribuyente', 'Ventas Consumidor')
              AND date_trunc('month', transaction_date) = (SELECT max_month FROM latest_month)
            GROUP BY client_id
        ),
        rfm_base AS (
            SELECT 
                client_id,
                MAX(transaction_date) as last_purchase_date,
                COUNT(id) as frequency,
                SUM(amount) as total_monetary
            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
              AND transaction_type IN ('Ventas Contribuyente', 'Ventas Consumidor')
              AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
            GROUP BY client_id
        ),
        rfm_scores AS (
            SELECT 
                client_id,
                NTILE(5) OVER (ORDER BY last_purchase_date ASC) AS r_score,
                NTILE(5) OVER (ORDER BY frequency ASC) AS f_score,
                NTILE(5) OVER (ORDER BY total_monetary ASC) AS m_score
            FROM rfm_base
        )
        SELECT 
            ms.client_id,
            ms.customer_name,
            ms.monto_mes,
            CASE 
                WHEN rs.r_score >= 4 AND rs.f_score >= 4 AND rs.m_score >= 4 THEN 'estrella'
                WHEN rs.r_score <= 2 THEN 'atencion'
                WHEN rs.r_score >= 4 AND rs.f_score <= 2 THEN 'prometedores'
                WHEN rs.r_score >= 3 AND rs.f_score >= 3 THEN 'habituales'
                ELSE 'desarrollo'
            END AS segment_key
        FROM monthly_sales ms
        LEFT JOIN rfm_scores rs ON ms.client_id = rs.client_id
        ORDER BY ms.monto_mes DESC
        LIMIT 20;
    """
 
    try:
        results = duck_con.execute(query, [tenant_id, year, year, tenant_id, tenant_id, year, year]).fetchall()
        columns = [desc[0] for desc in duck_con.description]
        
        data = []
        for row in results:
            item = dict(zip(columns, row))
            key = item.pop("segment_key")
            mapping = SEGMENT_MAPPING.get(key, SEGMENT_MAPPING["desarrollo"])
            
            item["etiqueta"] = mapping["label"]
            item["color"] = mapping["color"]
            item["narrativa"] = mapping["insight"]
            data.append(item)
 
        # Obtener nombre del mes para la respuesta
        month_query = """
            SELECT MAX(date_trunc('month', transaction_date)) 
            FROM pg.public.financial_records 
            WHERE tenant_id = ? AND status = 'Valido'
              AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
        """
        month_res = duck_con.execute(month_query, [tenant_id, year, year]).fetchone()M pg.public.financial_records WHERE tenant_id = ? AND status = 'Valido'", [tenant_id]).fetchone()
        periodo = str(month_res[0])[:7] if month_res and month_res[0] else "Actual"

        return {
            "status": "success",
            "periodo": periodo,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en clientes mensuales: {str(e)}")

@router.get("/tax-summary/iva-liquidation")
@cache_response(expire=1800)
def get_iva_liquidation(
    year: int = None,
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado")

    query = """
        WITH latest_month AS (
            SELECT MAX(date_trunc('month', transaction_date)) as max_month
            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
              AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
        ),
        filtered_records AS (
            SELECT transaction_type, iva_amount, retention_amount, retention_percentage
            FROM pg.public.financial_records
            WHERE tenant_id = ? 
              AND status = 'Valido'
              AND date_trunc('month', transaction_date) = (SELECT max_month FROM latest_month)
        )
        SELECT 
            SUM(CASE WHEN transaction_type IN ('Ventas Contribuyente', 'Ventas Consumidor') THEN iva_amount ELSE 0 END) as debito_fiscal,
            SUM(CASE WHEN transaction_type = 'Compras' THEN iva_amount ELSE 0 END) as credito_fiscal,
            SUM(CASE WHEN retention_percentage = 1 THEN retention_amount ELSE 0 END) as retencion_1,
            SUM(CASE WHEN retention_percentage = 2 THEN retention_amount ELSE 0 END) as anticipo_2,
            SUM(CASE WHEN retention_percentage = 13 THEN retention_amount ELSE 0 END) as retencion_13
        FROM filtered_records;
    """
    try:
        results = duck_con.execute(query, [tenant_id, year, year, tenant_id]).fetchone()
        columns = [desc[0] for desc in duck_con.description]
        data = dict(zip(columns, results)) if results else {
            "debito_fiscal": 0, "credito_fiscal": 0, 
            "retencion_1": 0, "anticipo_2": 0, "retencion_13": 0
        }
        
        # Determine month string for frontend display
        month_query = """
            SELECT MAX(date_trunc('month', transaction_date)) 
            FROM pg.public.financial_records 
            WHERE tenant_id = ? AND status = 'Valido'
              AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
        """
        month_result = duck_con.execute(month_query, [tenant_id, year, year]).fetchone()
        month_str = str(month_result[0])[:7] if month_result and month_result[0] else None

        data["neto"] = (data["debito_fiscal"] or 0) - (data["credito_fiscal"] or 0)
        data["periodo"] = month_str

        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis DuckDB: {str(e)}")

@router.get("/tax-summary/top-entities")
@cache_response(expire=1800)
def get_top_entities(
    year: int = None,
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    tenant_id = user_data.get("tenant_id")
    if not te        # Top Clients
        query_clients = """
            WITH latest_month AS (
                SELECT MAX(date_trunc('month', transaction_date)) as max_month
                FROM pg.public.financial_records
                WHERE tenant_id = ? AND status = 'Valido'
                  AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
            )
            SELECT nit_dui, SUM(amount) as total_amount
            FROM pg.public.financial_records
            WHERE tenant_id = ? 
              AND status = 'Valido'
              AND transaction_type IN ('Ventas Contribuyente', 'Ventas Consumidor')
              AND date_trunc('month', transaction_date) = (SELECT max_month FROM latest_month)
              AND nit_dui IS NOT NULL
            GROUP BY nit_dui
            ORDER BY total_amount DESC
            LIMIT 5;
        """
        clients_res = duck_con.execute(query_clients, [tenant_id, year, year, tenant_id]).fetchall()
        clients_data = [{"nit_dui": row[0], "total_amount": float(row[1])} for row in clients_res]
 
        # Top Suppliers
        query_suppliers = """
            WITH latest_month AS (
                SELECT MAX(date_trunc('month', transaction_date)) as max_month
                FROM pg.public.financial_records
                WHERE tenant_id = ? AND status = 'Valido'
                  AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
            )
            SELECT nit_dui, SUM(amount) as total_amount
            FROM pg.public.financial_records
            WHERE tenant_id = ? 
              AND status = 'Valido'
              AND transaction_type = 'Compras'
              AND date_trunc('month', transaction_date) = (SELECT max_month FROM latest_month)
              AND nit_dui IS NOT NULL
            GROUP BY nit_dui
            ORDER BY total_amount DESC
            LIMIT 5;
        """
        suppliers_res = duck_con.execute(query_suppliers, [tenant_id, year, year, tenant_id]).fetchall()
        suppliers_data = [{"nit_dui": row[0], "total_amount": float(row[1])} for row in suppliers_res]    suppliers_data = [{"nit_dui": row[0], "total_amount": float(row[1])} for row in suppliers_res]

        return {
            "status": "success",
            "data": {
                "top_clients": clients_data,
                "top_suppliers": suppliers_data
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis DuckDB: {str(e)}")

@router.get("/tax-summary/document-health")
@cache_response(expire=1800)
def get_document_health(
    year: int = None,
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado")

    query = """
        WITH latest_month AS (
            SELECT MAX(date_trunc('month', transaction_date)) as max_month
            FROM pg.public.financial_records
            WHERE tenant_id = ?
              AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
        )
        SELECT status, COUNT(*) as count
        FROM pg.public.financial_records
        WHERE tenant_id = ?
          AND date_trunc('month', transaction_date) = (SELECT max_month FROM latest_month)
        GROUP BY status;
    """
    try:
        results = duck_con.execute(query, [tenant_id, year, year, tenant_id]).fetchall()
        data = {row[0]: row[1] for row in results}
        
        valido = data.get("Valido", 0)
        anulado = data.get("Anulado", 0)
        extraviado = data.get("Extraviado", 0)
        invalidado = data.get("Invalidado", 0)
        
        total = valido + anulado + extraviado + invalidado
        health_score = (valido / total * 100) if total > 0 else 100

        return {
            "status": "success",
            "data": {
                "valido": valido,
                "anulado": anulado,
                "extraviado": extraviado,
                "invalidado": invalidado,
                "total": total,
                "health_score": health_score
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis DuckDB: {str(e)}")

@router.get("/financial-trends")
@cache_response(expire=3600)
def get_financial_trends(
    year: int = None,
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado")

    query = """
        WITH base AS (
            SELECT 
                EXTRACT('month' FROM transaction_date) AS month_num,
                EXTRACT('year' FROM transaction_date) AS year_num,
                SUM(CASE WHEN transaction_type IN ('Ventas Contribuyente', 'Ventas Consumidor') THEN amount ELSE 0 END) AS ventas,
                SUM(CASE WHEN transaction_type IN ('Compras', 'Sujetos Excluidos', 'Gastos Nomina') THEN amount ELSE 0 END) AS gastos
            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
            GROUP BY month_num, year_num
        ),
        current_year_cte AS (
            SELECT COALESCE(?::int, (SELECT MAX(year_num) FROM base)) as max_year
        )
        SELECT 
            b.month_num,
            cy.max_year AS year_num,
            SUM(CASE WHEN b.year_num = cy.max_year THEN b.ventas ELSE 0 END) AS ventas_actual,
            SUM(CASE WHEN b.year_num = cy.max_year - 1 THEN b.ventas ELSE 0 END) AS ventas_anterior,
            SUM(CASE WHEN b.year_num = cy.max_year THEN b.gastos ELSE 0 END) AS gastos_actual,
            SUM(CASE WHEN b.year_num = cy.max_year - 1 THEN b.gastos ELSE 0 END) AS gastos_anterior
        FROM base b
        CROSS JOIN current_year_cte cy
        GROUP BY b.month_num, cy.max_year
        ORDER BY b.month_num;
    """
    try:
        results = duck_con.execute(query, [tenant_id, year]).fetchall()
        
        months_es = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        
        data = []
        for row in results:
            month_idx = int(row[0]) - 1
            ventas_actual = float(row[2])
            gastos_actual = float(row[4])
            rentabilidad = ventas_actual - gastos_actual
            
            data.append({
                "mes": months_es[month_idx] if 0 <= month_idx < 12 else str(row[0]),
                "year": int(row[1]) if row[1] is not None else None,
                "ventas_actual": ventas_actual,
                "ventas_anterior": float(row[3]),
                "gastos_actual": gastos_actual,
                "gastos_anterior": float(row[5]),
                "rentabilidad": rentabilidad
            })
            
        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis DuckDB: {str(e)}")

@router.get("/types-breakdown")
@cache_response(expire=3600)
def get_types_breakdown(
    year: int = None,
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado")

    query = """
        WITH latest_month AS (
            SELECT MAX(date_trunc('month', transaction_date)) as max_month
            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
              AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
        )
        SELECT 
            transaction_type, 
            document_type, 
            SUM(amount) as total
        FROM pg.public.financial_records
        WHERE tenant_id = ? AND status = 'Valido'
          AND date_trunc('month', transaction_date) = (SELECT max_month FROM latest_month)
        GROUP BY transaction_type, document_type
        ORDER BY total DESC;
    """
    try:
        results = duck_con.execute(query, [tenant_id, year, year, tenant_id]).fetchall()
        
        ventas_data = []
        gastos_data = []
        
        for row in results:
            t_type = row[0]
            d_type = row[1]
            total = float(row[2])
            
            # Mapeo simple de nombres de documentos
            doc_names = {
                "01": "Factura",
                "03": "Comprobante Crédito Fiscal",
                "04": "Nota de Remisión",
                "05": "Nota de Crédito",
                "06": "Nota de Débito",
                "11": "Factura de Exportación"
            }
            doc_name = f"{d_type} - {doc_names.get(d_type, 'Otro')}"
            
            if t_type in ["Ventas Contribuyente", "Ventas Consumidor"]:
                ventas_data.append({"name": f"{t_type} ({doc_name})", "value": total})
            elif t_type in ["Compras", "Sujetos Excluidos", "Gastos Nomina"]:
                label = t_type if t_type != "Compras" else doc_name
                gastos_data.append({"name": label, "value": total})
                
        return {
            "status": "success",
            "data": {
                "ventas": ventas_data,
                "gastos": gastos_data
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis DuckDB: {str(e)}")


@router.get("/payroll-summary")
@cache_response(expire=3600)
def get_payroll_summary(
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    """
    Resumen de nómina para tenant_A: ISR retenido, AFP, ISSS
    desglosados por período (mes/año). Útil para liquidación de renta y
    verificación de obligaciones de seguridad social.
    """
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado")

    query = """
        SELECT
            EXTRACT('year'  FROM transaction_date) AS anio,
            EXTRACT('month' FROM transaction_date) AS mes,
            COUNT(*)                               AS empleados,
            SUM(amount)                            AS salarios_brutos,
            SUM(retention_amount)                  AS isr_total,
            SUM(afp_amount)                        AS afp_total,
            SUM(isss_amount)                       AS isss_total,
            SUM(amount - retention_amount - afp_amount - isss_amount) AS salario_neto_total
        FROM pg.public.financial_records
        WHERE tenant_id = ?
          AND transaction_type = 'Gastos Nomina'
          AND status = 'Valido'
        GROUP BY anio, mes
        ORDER BY anio, mes;
    """
    try:
        results = duck_con.execute(query, [tenant_id]).fetchall()
        months_es = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
        data = []
        for row in results:
            month_idx = int(row[1]) - 1
            data.append({
                "periodo": f"{months_es[month_idx]} {int(row[0])}",
                "empleados": int(row[2]),
                "salarios_brutos": float(row[3] or 0),
                "isr_total": float(row[4] or 0),
                "afp_total": float(row[5] or 0),
                "isss_total": float(row[6] or 0),
                "salario_neto_total": float(row[7] or 0),
            })
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis de nómina: {str(e)}")

@router.get("/tax-summary/annexes/ventas")
@cache_response(expire=600)
def get_ventas_annex(
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    """
    Retorna los datos para el Anexo 1 (Ventas a Contribuyentes) y Anexo 2 (Consumidor Final)
    formateados según el requerimiento de Stitch y Hacienda.
    """
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado")

    query = """
        WITH latest_month AS (
            SELECT MAX(date_trunc('month', transaction_date)) as max_month
            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
        )
        SELECT 
            CAST(transaction_date AS VARCHAR) as fecha,
            transaction_type,
            document_type as tipo_doc,
            nit_dui as numero, -- En consumidor final nit_dui guarda el rango
            nit_dui,
            customer_name as nombre,
            COALESCE(exento_amount, 0.0) as exento,
            amount as gravado,
            iva_amount as iva,
            (amount + iva_amount) as total
        FROM pg.public.financial_records
        WHERE tenant_id = ? 
          AND status = 'Valido'
          AND transaction_type IN ('Ventas Contribuyente', 'Ventas Consumidor')
          AND date_trunc('month', transaction_date) = (SELECT max_month FROM latest_month)
        ORDER BY transaction_date DESC;
    """
    try:
        results = duck_con.execute(query, [tenant_id, tenant_id]).fetchall()
        columns = [desc[0] for desc in duck_con.description]
        data = [dict(zip(columns, row)) for row in results]
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en anexo de ventas: {str(e)}")

@router.get("/tax-summary/annexes/compras")
@cache_response(expire=600)
def get_compras_annex(
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    """
    Retorna los datos para el Anexo 4 (Compras) formateados según el requerimiento.
    """
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado")

    query = """
        WITH latest_month AS (
            SELECT MAX(date_trunc('month', transaction_date)) as max_month
            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
        )
        SELECT 
            CAST(transaction_date AS VARCHAR) as fecha,
            'Compras' as transaction_type,
            document_type as tipo_doc,
            nit_dui,
            customer_name as nombre,
            COALESCE(exento_amount, 0.0) as exento,
            amount as gravado,
            iva_amount as iva,
            (amount + iva_amount) as total
        FROM pg.public.financial_records
        WHERE tenant_id = ? 
          AND status = 'Valido'
          AND transaction_type = 'Compras'
          AND date_trunc('month', transaction_date) = (SELECT max_month FROM latest_month)
        ORDER BY transaction_date DESC;
    """
    try:
        results = duck_con.execute(query, [tenant_id, tenant_id]).fetchall()
        columns = [desc[0] for desc in duck_con.description]
        data = [dict(zip(columns, row)) for row in results]
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en anexo de compras: {str(e)}")

@router.get("/tax-summary/annexes/payroll")
@cache_response(expire=600)
def get_payroll_annex(
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    """
    Retorna los datos detallados para el Anexo de Renta (F14) - Nómina.
    """
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado")

    query = """
        WITH latest_month AS (
            SELECT MAX(date_trunc('month', transaction_date)) as max_month
            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
              AND transaction_type = 'Gastos Nomina'
        )
        SELECT 
            CAST(transaction_date AS VARCHAR) as fecha,
            'F14' as tipo_doc,
            nit_dui as numero,
            nit_dui,
            customer_name as nombre,
            COALESCE(exento_amount, 0.0) as exento,
            amount as gravado, -- Salario Bruto
            afp_amount as afp,
            isss_amount as isss,
            retention_amount as isr,
            (amount - afp_amount - isss_amount - retention_amount) as total -- Salario Neto
        FROM pg.public.financial_records
        WHERE tenant_id = ? 
          AND status = 'Valido'
          AND transaction_type = 'Gastos Nomina'
          AND date_trunc('month', transaction_date) = (SELECT max_month FROM latest_month)
        ORDER BY customer_name ASC;
    """
    try:
        results = duck_con.execute(query, [tenant_id, tenant_id]).fetchall()
        columns = [desc[0] for desc in duck_con.description]
        data = [dict(zip(columns, row)) for row in results]
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en anexo de nómina: {str(e)}")

@router.get("/supplier-rfm")
@cache_response(expire=3600)
def get_supplier_rfm_analysis(
    year: int = None,
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    tenant_id = user_data.get("tenant_id")        WITH rfm_base AS (
            SELECT 
                nit_dui as supplier_id,
                MAX(customer_name) as supplier_name,
                MAX(transaction_date) as last_purchase_date,
                COUNT(id) as frequency,
                SUM(amount) as monetary
            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
              AND transaction_type = 'Compras'
              AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
            GROUP BY nit_dui
        ),
        rfm_scores AS (
            SELECT 
                supplier_id,
                supplier_name,
                last_purchase_date,
                frequency,
                monetary,
                NTILE(5) OVER (ORDER BY last_purchase_date ASC) AS r_score,
                NTILE(5) OVER (ORDER BY frequency ASC) AS f_score,
                NTILE(5) OVER (ORDER BY monetary ASC) AS m_score
            FROM rfm_base
        )
        SELECT 
            supplier_id,
            supplier_name,
            CAST(last_purchase_date AS VARCHAR) as last_purchase,
            frequency,
            monetary,
            CASE 
                WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'estrella'
                WHEN r_score <= 2 THEN 'atencion'
                WHEN r_score >= 4 AND f_score <= 2 THEN 'prometedores'
                WHEN r_score >= 3 AND f_score >= 3 THEN 'habituales'
                ELSE 'desarrollo'
            END AS segment_key
        FROM rfm_scores
        ORDER BY monetary DESC;
    """
 
    try:
        results = duck_con.execute(query, [tenant_id, year, year]).fetchall()res
        ORDER BY monetary DESC;
    """

    try:
        results = duck_con.execute(query, [tenant_id]).fetchall()
        columns = [desc[0] for desc in duck_con.description]
        
        raw_data = [dict(zip(columns, row)) for row in results]
        
        final_data = []
        summary_counts = {}
        
        for item in raw_data:
            key = item.pop("segment_key")
            # We can use the same mapping for suppliers or a custom one. 
            # For now, let's reuse SEGMENT_MAPPING but with supplier-focused insights if needed.
            mapping = SEGMENT_MAPPING.get(key, SEGMENT_MAPPING["desarrollo"])
            
            # Mapear campos del backend al formato esperado por el frontend
            # Categorizar proveedores basado en frecuencia y monto
            frequency = float(item.get("frequency", 0) or 0)
            monetary = float(item.get("monetary", 0) or 0)
            
            if frequency >= 10:
                categoria = "Socio Estratégico"
            elif frequency >= 5:
                categoria = "Gasto Recurrente"
            else:
                categoria = "Eventual"
            
            final_item = {
                "id": item.get("supplier_id", ""),
                "nombre": item.get("supplier_name", "DESCONOCIDO"),
                "giro": "",  # No disponible en datos fiscales
                "categoria": categoria,
                "gastoHistorico": monetary,
                "ordenPromedio": monetary / max(frequency, 1),
                "tendenciaAnual": [],  # Se calculará en versión futura
                "insightIA": mapping["insight"].replace("Cliente", "Proveedor").replace("compra", "venta"),
                "historialOrdenes": []
            }
            
            final_data.append(final_item)
            
            label = mapping["label"]
            summary_counts[label] = summary_counts.get(label, 0) + 1

        return {
            "status": "success",
            "data": final_data,
            "summary": [{"name": k, "value": v} for k, v in summary_counts.items()]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis de proveedores: {str(e)}")

@router.get("/monthly-suppliers")
@cache_response(expire=600)
def get_monthly_suppliers(
    year: int = None,
    user_data: dict = Depends(require_cliente),
    duck_con = Depends(get_duckdb_client)
):
    tenant_id = user_data.get("tenant_        WITH latest_month AS (
            SELECT MAX(date_trunc('month', transaction_date)) as max_month
            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
              AND transaction_type = 'Compras'
              AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
        ),
        monthly_purchases AS (
            SELECT 
                nit_dui as supplier_id,
                MAX(customer_name) as supplier_name,
                SUM(amount) as monto_mes
            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
              AND transaction_type = 'Compras'
              AND date_trunc('month', transaction_date) = (SELECT max_month FROM latest_month)
            GROUP BY nit_dui
        ),
        rfm_base AS (
            SELECT 
                nit_dui as supplier_id,
                MAX(transaction_date) as last_purchase_date,
                COUNT(id) as frequency,
                SUM(amount) as total_monetary
            FROM pg.public.financial_records
            WHERE tenant_id = ? AND status = 'Valido'
              AND transaction_type = 'Compras'
              AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
            GROUP BY nit_dui
        ),
        rfm_scores AS (
            SELECT 
                supplier_id,
                NTILE(5) OVER (ORDER BY last_purchase_date ASC) AS r_score,
                NTILE(5) OVER (ORDER BY frequency ASC) AS f_score,
                NTILE(5) OVER (ORDER BY total_monetary ASC) AS m_score
            FROM rfm_base
        )
        SELECT 
            mp.supplier_id,
            mp.supplier_name,
            mp.monto_mes,
            CASE 
                WHEN rs.r_score >= 4 AND rs.f_score >= 4 AND rs.m_score >= 4 THEN 'estrella'
                WHEN rs.r_score <= 2 THEN 'atencion'
                WHEN rs.r_score >= 4 AND rs.f_score <= 2 THEN 'prometedores'
                WHEN rs.r_score >= 3 AND rs.f_score >= 3 THEN 'habituales'
                ELSE 'desarrollo'
            END AS segment_key
        FROM monthly_purchases mp
        LEFT JOIN rfm_scores rs ON mp.supplier_id = rs.supplier_id
        ORDER BY mp.monto_mes DESC
        LIMIT 20;
    """
 
    try:
        results = duck_con.execute(query, [tenant_id, year, year, tenant_id, tenant_id, year, year]).fetchall()
        columns = [desc[0] for desc in duck_con.description]
        
        data = []
        for row in results:
            item = dict(zip(columns, row))
            key = item.pop("segment_key")
            mapping = SEGMENT_MAPPING.get(key, SEGMENT_MAPPING["desarrollo"])
            
            item["etiqueta"] = mapping["label"]
            item["color"] = mapping["color"]
            item["narrativa"] = mapping["insight"].replace("Cliente", "Proveedor").replace("compra", "venta")
            data.append(item)
 
        month_query = """
            SELECT MAX(date_trunc('month', transaction_date)) 
            FROM pg.public.financial_records 
            WHERE tenant_id = ? AND status = 'Valido' AND transaction_type = 'Compras'
              AND (?::int IS NULL OR EXTRACT('year' FROM transaction_date) = ?::int)
        """
        month_res = duck_con.execute(month_query, [tenant_id, year, year]).fetchone()
        periodo = str(month_res[0])[:7] if month_res and month_res[0] else "Actual"e = 'Compras'", [tenant_id]).fetchone()
        periodo = str(month_res[0])[:7] if month_res and month_res[0] else "Actual"

        return {
            "status": "success",
            "periodo": periodo,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en proveedores mensuales: {str(e)}")
