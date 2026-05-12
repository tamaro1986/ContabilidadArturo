from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Form
from supabase import Client
import uuid
import magic
from app.services.supabase_client import get_supabase_client
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
    supabase: Client = Depends(get_supabase_client)
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
    
    # 2. Subir a Storage
    try:
        file_content = await file.read()
        supabase.storage.from_(BUCKET_NAME).upload(
            file=file_content,
            path=safe_filename,
            file_options={"content-type": mime_type}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Storage: {str(e)}")
    
    # 3. Registrar Historial en csv_upload_history
    upload_id = str(uuid.uuid4())
    try:
        supabase.table("csv_upload_history").insert({
            "id": upload_id,
            "tenant_id": tenant_id,
            "company_id": company_id,
            "document_type": document_type,
            "filename": file.filename,
            "file_path": safe_filename,
            "status": "processing",
            "uploaded_by": contador_data["user"].id if contador_data.get("user") else None
        }).execute()
    except Exception as e:
        print(f"Error registering upload in DB: {e}")
        raise HTTPException(status_code=500, detail=f"Error al registrar historial: {str(e)}")

    # 4. Encolar Tarea usando BackgroundTasks de FastAPI
    background_tasks.add_task(
        process_financial_csv,
        bucket_name=BUCKET_NAME,
        file_path=safe_filename,
        tenant_id=tenant_id,
        company_id=company_id,
        upload_id=upload_id
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
            .select("*, companies(name), user_profiles:uploaded_by(full_name)")\
            .eq("tenant_id", contador_data["tenant_id"])
        
        if company_id:
            query = query.eq("company_id", company_id)
            
        res = query.order("created_at", desc=True)\
            .limit(50)\
            .execute()
            
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Historial no disponible: {str(e)}")

