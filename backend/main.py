import os
import uuid
import shutil
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Importar el procesador analítico
from processor import process_csv_task

load_dotenv()

app = FastAPI(title="Contabilidad Arturo - Analytical Engine")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directorio temporal para procesamiento seguro
UPLOAD_DIR = Path("temp_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.post("/api/v1/process-csv", status_code=status.HTTP_202_ACCEPTED)
async def upload_and_process_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    tenant_id: str = "default"
):
    # 1. Validación de Seguridad (Tipo MIME)
    if file.content_type != "text/csv":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archivo inválido. Solo se permiten archivos CSV (text/csv)."
        )

    # 2. Sanitización: Nombre de archivo único (UUID) para evitar Directory Traversal
    file_extension = ".csv"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename

    # 3. Almacenamiento Seguro Temporal
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el archivo: {str(e)}"
        )
    finally:
        file.file.close()

    # 4. Encolar procesamiento en segundo plano (BackgroundTasks)
    background_tasks.add_task(process_csv_task, str(file_path), tenant_id)

    return {
        "status": "accepted",
        "message": "Archivo recibido y en cola de procesamiento.",
        "file_id": unique_filename,
        "tenant_id": tenant_id
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "engine": "duckdb"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
