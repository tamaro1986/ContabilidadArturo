import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import psycopg2
from app.core.config import settings
from app.api.dependencies.roles import require_cliente

logger = logging.getLogger(__name__)
router = APIRouter()


class CompanyCreate(BaseModel):
    name: str
    nit: str


class CompanyResponse(BaseModel):
    id: str
    tenant_id: str
    user_id: str
    name: str
    nit: str
    created_at: datetime
    updated_at: datetime
    status: str = "active"
    total_records: int = 0
    last_processed_month: Optional[str] = None


def get_pg_conn():
    db_url = settings.DATABASE_URL or settings.DIRECT_URL
    if db_url:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        return conn
    return None


@router.get("", response_model=List[CompanyResponse])
def list_companies(user_data: dict = Depends(require_cliente)):
    tenant_id = user_data.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID no encontrado")

    conn = get_pg_conn()
    if not conn:
        return []

    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                c.id, c.tenant_id, c.user_id, c.name, c.nit, c.created_at, c.updated_at,
                COALESCE((SELECT COUNT(*) FROM public.financial_records fr WHERE fr.company_id = c.id), 0) as total_records
            FROM public.companies c
            WHERE c.tenant_id = %s
            ORDER BY c.name ASC;
        """, (tenant_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        companies = []
        for r in rows:
            companies.append({
                "id": str(r[0]),
                "tenant_id": str(r[1]),
                "user_id": str(r[2]),
                "name": str(r[3]),
                "nit": str(r[4]),
                "created_at": r[5],
                "updated_at": r[6],
                "status": "active",
                "total_records": int(r[7] or 0),
                "last_processed_month": None,
            })
        return companies
    except Exception as e:
        conn.close()
        logger.warning(f"Error al listar empresas: {e}")
        return []


@router.post("", response_model=CompanyResponse)
def create_company(
    company_in: CompanyCreate,
    user_data: dict = Depends(require_cliente),
):
    tenant_id = user_data.get("tenant_id")
    user = user_data.get("user")
    user_id = str(user.id) if user and hasattr(user, "id") else None

    if not tenant_id or not user_id:
        raise HTTPException(status_code=400, detail="Tenant o usuario no identificado.")

    conn = get_pg_conn()
    if not conn:
        raise HTTPException(status_code=500, detail="Base de datos no disponible.")

    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO public.companies (tenant_id, user_id, name, nit)
            VALUES (%s, %s, %s, %s)
            RETURNING id, tenant_id, user_id, name, nit, created_at, updated_at;
        """, (tenant_id, user_id, company_in.name, company_in.nit))
        row = cur.fetchone()
        cur.close()
        conn.close()

        return {
            "id": str(row[0]),
            "tenant_id": str(row[1]),
            "user_id": str(row[2]),
            "name": str(row[3]),
            "nit": str(row[4]),
            "created_at": row[5],
            "updated_at": row[6],
            "status": "active",
            "total_records": 0,
            "last_processed_month": None,
        }
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Error al registrar la empresa: {str(e)}")
