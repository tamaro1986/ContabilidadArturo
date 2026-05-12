from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from typing import Optional, List
from app.services.supabase_client import get_supabase_client
from app.api.dependencies.roles import require_contador

router = APIRouter()

@router.get("/history")
async def get_detailed_upload_history(
    company_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    contador_data: dict = Depends(require_contador),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Retorna el historial detallado de cargas CSV con trazabilidad de procesamiento.
    Soporta paginación y filtrado por empresa.
    """
    tenant_id = contador_data["tenant_id"]
    
    try:
        # 1. Preparar la consulta
        # Seleccionamos campos de trazabilidad + nombre de empresa + responsable
        query = supabase.table("csv_upload_history")\
            .select("*, companies(name), user_profiles:uploaded_by(full_name)")\
            .eq("tenant_id", tenant_id)
        
        if company_id:
            query = query.eq("company_id", company_id)
            
        # 2. Paginación
        start = (page - 1) * page_size
        end = start + page_size - 1
        
        # 3. Ejecutar consulta con orden descendente
        res = query.order("created_at", desc=True)\
            .range(start, end)\
            .execute()
            
        return {
            "status": "success",
            "data": res.data,
            "metadata": {
                "page": page,
                "page_size": page_size,
                "count": len(res.data)
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Error al obtener trazabilidad de cargas: {str(e)}"
        )

@router.get("/status/{upload_id}")
async def get_upload_status(
    upload_id: str,
    contador_data: dict = Depends(require_contador),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Endpoint rápido para polling del estado de un upload específico.
    """
    tenant_id = contador_data["tenant_id"]
    
    try:
        res = supabase.table("csv_upload_history")\
            .select("id, status, records_processed, error_message")\
            .eq("id", upload_id)\
            .eq("tenant_id", tenant_id)\
            .single()\
            .execute()
            
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=404, detail="Registro de carga no encontrado")
