import hashlib
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Form
from supabase import Client
import uuid
import magic
from app.services.supabase_client import get_supabase_client, get_supabase_admin_client
from app.api.dependencies.roles import require_contador
from app.worker.tasks import process_financial_csv

router = APIRouter()

BUCKET_NAME = "financial_uploads"

@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_financial_data(
    background_tasks: BackgroundTasks,
    company_id: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    contador_data: dict = Depends(require_contador),
    supabase_admin: Client = Depends(get_supabase_admin_client)
):
    """Sube un CSV o ZIP con datos financieros de Hacienda."""
    # 1. Validaciones de Seguridad
    file_bytes = await file.read(2048)
    mime_type = magic.from_buffer(file_bytes, mime=True)
    await file.seek(0)
    
    allowed_mimes = ["text/csv", "text/plain", "application/zip", "application/x-zip-compressed"]
    if mime_type not in allowed_mimes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no permitido: {mime_type}. Use CSV o ZIP."
        )
    
    tenant_id = contador_data["tenant_id"]
    file_ext = "zip" if "zip" in mime_type else "csv"
    safe_filename = f"{tenant_id}/{uuid.uuid4()}.{file_ext}"
    
    # 2. Leer contenido y calcular hash SHA-256 para dedup
    file_content = await file.read()
    file_hash = hashlib.sha256(file_content).hexdigest()
    
    # Verificar duplicados por hash en la base de datos
    existing = supabase_admin.table("csv_upload_history")\
        .select("id")\
        .eq("tenant_id", tenant_id)\
        .eq("company_id", company_id)\
        .eq("file_hash", file_hash)\
        .execute()
        
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este archivo ya fue procesado anteriormente para esta empresa."
        )
    
    # 3. Subir a Storage
    try:
        supabase_admin.storage.from_(BUCKET_NAME).upload(
            file=file_content,
            path=safe_filename,
            file_options={"content-type": mime_type}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Storage: {str(e)}")
    
    # 4. Registrar Historial en tax_documents y csv_upload_history
    upload_id = str(uuid.uuid4())
    tax_doc_id = str(uuid.uuid4())
    
    try:
        # Registrar en tax_documents (utilizado por el Dashboard)
        supabase_admin.table("tax_documents").insert({
            "id": tax_doc_id,
            "tenant_id": tenant_id,
            "company_id": company_id,
            "document_type": document_type,
            "filename": file.filename,
            "file_path": safe_filename,
            "status": "pending"
        }).execute()
        
        # Registrar en csv_upload_history (historial detallado de carga)
        supabase_admin.table("csv_upload_history").insert({
            "id": upload_id,
            "tenant_id": tenant_id,
            "company_id": company_id,
            "document_type": document_type,
            "filename": file.filename,
            "file_path": safe_filename,
            "file_hash": file_hash,
            "status": "processing",
            "uploaded_by": contador_data["user"].id if contador_data.get("user") else None
        }).execute()
    except Exception as e:
        print(f"Error registering upload in DB: {e}")
        raise HTTPException(status_code=500, detail=f"Error al registrar documento o historial: {str(e)}")

    # 5. Encolar Tarea usando BackgroundTasks de FastAPI
    background_tasks.add_task(
        process_financial_csv,
        bucket_name=BUCKET_NAME,
        file_path=safe_filename,
        tenant_id=tenant_id,
        company_id=company_id,
        upload_id=upload_id,
        tax_doc_id=tax_doc_id,
        document_type=document_type
    )
    
    return {
        "message": "Archivo recibido. Procesamiento en segundo plano iniciado.",
        "upload_id": upload_id
    }

@router.get("/uploads")
async def get_upload_history(
    company_id: str = None,
    contador_data: dict = Depends(require_contador),
    supabase: Client = Depends(get_supabase_client)
):
    """Retorna el historial de cargas del tenant o de una empresa específica."""
    try:
        query = supabase.table("csv_upload_history")\
            .select("*, companies(name)")\
            .eq("tenant_id", contador_data["tenant_id"])
        
        if company_id:
            query = query.eq("company_id", company_id)
            
        res = query.order("created_at", desc=True)\
            .limit(50)\
            .execute()
            
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Historial no disponible: {str(e)}")

@router.delete("/uploads/{upload_id}")
async def delete_upload(
    upload_id: str,
    contador_data: dict = Depends(require_contador),
    supabase_admin: Client = Depends(get_supabase_admin_client)
):
    """Elimina una entrada del historial de cargas."""
    try:
        res = supabase_admin.table("csv_upload_history")\
            .delete()\
            .eq("id", upload_id)\
            .eq("tenant_id", contador_data["tenant_id"])\
            .execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Carga no encontrada")
        return {"status": "success", "message": "Carga eliminada del historial"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar: {str(e)}")

@router.delete("/company/{company_id}/records")
async def reset_company_records(
    company_id: str,
    contador_data: dict = Depends(require_contador),
    supabase_admin: Client = Depends(get_supabase_admin_client)
):
    """Elimina todos los registros financieros e historial de cargas de una empresa."""
    try:
        supabase_admin.table("financial_records")\
            .delete()\
            .eq("company_id", company_id)\
            .eq("tenant_id", contador_data["tenant_id"])\
            .execute()
        supabase_admin.table("csv_upload_history")\
            .delete()\
            .eq("company_id", company_id)\
            .eq("tenant_id", contador_data["tenant_id"])\
            .execute()
        supabase_admin.table("tax_documents")\
            .delete()\
            .eq("company_id", company_id)\
            .eq("tenant_id", contador_data["tenant_id"])\
            .execute()
        supabase_admin.table("companies")\
            .update({"total_records": 0, "last_processed_month": None})\
            .eq("id", company_id)\
            .eq("tenant_id", contador_data["tenant_id"])\
            .execute()
        return {"status": "success", "message": "Datos de la empresa reiniciados"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al reiniciar: {str(e)}")

