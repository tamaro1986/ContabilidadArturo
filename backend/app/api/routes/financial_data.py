from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from supabase import Client
import uuid
import magic
from app.services.supabase_client import get_supabase_client
from app.api.dependencies.roles import require_contador
from app.worker.tasks import process_financial_csv

router = APIRouter()

BUCKET_NAME = "financial_uploads"

@router.post("/upload-csv", status_code=status.HTTP_202_ACCEPTED)
async def upload_csv(
    file: UploadFile = File(...),
    contador_data: dict = Depends(require_contador),
    supabase: Client = Depends(get_supabase_client)
):
    # 1. Leer los primeros bytes para validar el verdadero MIME Type
    file_bytes = await file.read(2048)
    
    # python-magic retorna descripciones o mimes, usamos mime=True
    mime_type = magic.from_buffer(file_bytes, mime=True)
    
    # Volver el cursor a 0 para poder leer/subir el archivo completo luego
    await file.seek(0)
    
    if mime_type not in ["text/csv", "text/plain"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato de archivo inválido. Detectado: {mime_type}. Se requiere text/csv."
        )
    
    # 2. Renombrar usando UUID de forma segura
    tenant_id = contador_data["tenant_id"]
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'csv'
    safe_filename = f"{tenant_id}/{uuid.uuid4()}.{file_extension}"
    
    # 3. Subir el archivo de manera segura al bucket de Supabase Storage
    try:
        file_content = await file.read()
        res = supabase.storage.from_(BUCKET_NAME).upload(
            file=file_content,
            path=safe_filename,
            file_options={"content-type": mime_type}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error subiendo archivo a Supabase: {str(e)}"
        )
        
    # 4. Encolar la tarea en Celery
    task = process_financial_csv.delay(
        bucket_name=BUCKET_NAME,
        file_path=safe_filename,
        tenant_id=tenant_id
    )
    
    # 5. Retornar inmediatamente un 202 Accepted
    return {
        "message": "Archivo aceptado y encolado para procesamiento.",
        "task_id": task.id
    }
