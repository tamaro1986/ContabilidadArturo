"""
mock_data.py — Inicializador de DuckDB para Modo Simulación.

Estrategia de carga:
  - tenant_A → datos estructurados reales (seeder.py desde ZIP de Hacienda)
  - tenant_B / tenant_C → datos aleatorios (comparación multi-tenant)

Si el ZIP no existe, todos los tenants usan datos aleatorios (fallback seguro).

Cambios de esquema respecto a la versión anterior:
  + afp_amount   DECIMAL(15,2)  — Deducción AFP (nómina)
  + isss_amount  DECIMAL(15,2)  — Deducción ISSS (nómina)
  (retention_amount queda exclusivo para ISR / IVA según transaction_type)
"""

import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path

# Ruta al ZIP de Hacienda (raíz del repositorio)
_ZIP_PATH = Path(__file__).resolve().parents[3] / "files simulador ventas.zip"

# ── Generador aleatorio (tenant_B y tenant_C) ─────────────────────────────────

def _generate_random_records(tenants: list[str]) -> list[tuple]:
    transaction_types = ["Ventas Contribuyente", "Ventas Consumidor", "Compras"]
    statuses = ["Valido", "Valido", "Valido", "Valido", "Valido", "Anulado", "Extraviado", "Invalidado"]
    document_types = ["01", "03", "04", "05"]
    clases_documento = ["1", "4", "4", "4"]

    clients = [f"CLIENTE_{i}" for i in range(10)]
    suppliers = [f"PROVEEDOR_{i}" for i in range(10)]

    records = []
    for tenant in tenants:
        for _ in range(500):
            t_type = random.choice(transaction_types)
            amount = round(random.uniform(10.0, 5000.0), 2)
            iva_amount = round(amount * 0.13, 2)

            retention_percentage = random.choice([0, 0, 0, 0, 1.00, 2.00, 13.00])
            retention_amount = round(amount * (retention_percentage / 100), 2) if retention_percentage > 0 else 0.00

            status = random.choice(statuses)
            if status != "Valido":
                amount = 0.00
                iva_amount = 0.00
                retention_amount = 0.00

            clase_doc = random.choice(clases_documento)
            doc_type = random.choice(document_types)
            nit_dui = random.choice(clients) if t_type != "Compras" else random.choice(suppliers)
            days_ago = random.randint(0, 730)
            t_date = (datetime.now() - timedelta(days=days_ago)).date()

            records.append((
                str(uuid.uuid4()),                                             # id
                tenant,                                                        # tenant_id
                nit_dui,                                                       # client_id
                f"Nombre de {nit_dui}",                                        # customer_name
                amount,                                                        # amount
                t_date.strftime("%Y-%m-%d"),                                   # transaction_date
                t_type,                                                        # transaction_type
                doc_type,                                                      # document_type
                clase_doc,                                                     # clase_de_documento
                nit_dui,                                                       # nit_dui
                str(uuid.uuid4()) if clase_doc == "4" else None,               # codigo_generacion
                f"SELLO_{random.randint(1000, 9999)}" if clase_doc == "4" else None,  # sello_recepcion
                iva_amount,                                                    # iva_amount
                retention_amount,                                              # retention_amount
                retention_percentage,                                          # retention_percentage
                0.00,                                                          # afp_amount (n/a en random)
                0.00,                                                          # isss_amount (n/a en random)
                status,                                                        # status
            ))
    return records


# ── Inicializador principal ───────────────────────────────────────────────────

def init_mock_duckdb(duck_con) -> None:
    print("--- MOCK MODE: Iniciando DuckDB en memoria ---")

    # Crear schema pg (simula Postgres)
    duck_con.execute("CREATE SCHEMA IF NOT EXISTS pg;")

    # ── Esquema actualizado con afp_amount e isss_amount ─────────────────────
    duck_con.execute("""
        CREATE TABLE IF NOT EXISTS pg.financial_records (
            id                   VARCHAR,
            tenant_id            VARCHAR,
            client_id            VARCHAR,
            customer_name        VARCHAR,         -- Nombre o Razón Social
            amount               DECIMAL(15,2),
            transaction_date     DATE,
            transaction_type     VARCHAR,
            document_type        VARCHAR,
            clase_de_documento   VARCHAR,
            nit_dui              VARCHAR,
            codigo_generacion    VARCHAR,
            sello_recepcion      VARCHAR,
            iva_amount           DECIMAL(15,2),
            retention_amount     DECIMAL(15,2),   -- ISR o IVA retenido según contexto
            retention_percentage DECIMAL(5,2),
            afp_amount           DECIMAL(15,2),   -- Deducción AFP (solo nómina)
            isss_amount          DECIMAL(15,2),   -- Deducción ISSS (solo nómina)
            status               VARCHAR
        );
    """)

    # Limpiar en caso de hot-reload
    duck_con.execute("DELETE FROM pg.financial_records;")

    # ── tenant_A: datos estructurados reales (si el ZIP existe) ──────────────
    if _ZIP_PATH.exists():
        try:
            from app.db.seeder import init_seeded_duckdb
            summary = init_seeded_duckdb(duck_con, _ZIP_PATH)
            print(f"[SEEDER] tenant_A cargado desde ZIP: {summary}")
        except Exception as exc:
            print(f"[SEEDER] ERROR al cargar ZIP — usando datos aleatorios para tenant_A: {exc}")
            _insert_random(duck_con, ["tenant_A"])
    else:
        print(f"[SEEDER] ZIP no encontrado en {_ZIP_PATH} — usando datos aleatorios para tenant_A")
        _insert_random(duck_con, ["tenant_A"])

    # ── tenant_B y tenant_C: datos aleatorios ────────────────────────────────
    _insert_random(duck_con, ["tenant_B", "tenant_C"])

    # ── Detección de anomalías automática (pre-calentado) ─────────────────────
    try:
        from app.services.anomaly_engine import run_anomaly_detection
        for tenant in ["tenant_A", "tenant_B", "tenant_C"]:
            summary = run_anomaly_detection(duck_con, tenant)
            print(f"[ANOMALY] {tenant}: {summary['total_anomalous']} anomalías ({summary['anomaly_rate_pct']}%)")
    except Exception as exc:
        print(f"[ANOMALY] Error en detección automática: {exc}")

    print("--- MOCK MODE: DuckDB listo ---")


def _insert_random(duck_con, tenants: list[str]) -> None:
    records = _generate_random_records(tenants)
    duck_con.executemany("""
        INSERT INTO pg.financial_records VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    """, records)
    print(f"[RANDOM] {len(records)} registros aleatorios para {tenants}")
