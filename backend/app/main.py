import uuid
import shutil
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, financial_data, analytics, ai as ai_router, upload_history, reports
from app.services.processor import process_csv_task

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# ── CORS Configuration ────────────────────────────────────────────────────────
# IMPORTANTE: Si allow_credentials=True, allow_origins NO puede ser ["*"]
# Usamos la lista de orígenes definida en settings.py
# Limpia los orígenes para asegurar que no tengan barras al final
clean_origins = [str(origin).rstrip("/") for origin in settings.CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=clean_origins, # Usamos la lista limpia
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"], # En desarrollo, permite todos para probar
    allow_headers=["*"],
    expose_headers=["*"],
)

# Directorio temporal para procesamiento seguro
UPLOAD_DIR = Path("temp_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.on_event("startup")
def startup_event():
    """
    Inicialización en el arranque. Si MOCK_MODE es True, prepara DuckDB en memoria.
    """
    if settings.MOCK_MODE:
        print("--- RUNNING IN MOCK MODE ---")
        import duckdb
        from app.services import duckdb_client
        duckdb_client.mock_con = duckdb.connect(':memory:')
        from app.db.mock_data import init_mock_duckdb
        init_mock_duckdb(duckdb_client.mock_con)

@app.get("/")
def read_root():
    return {"message": f"{settings.PROJECT_NAME} is running", "status": "online"}

@app.get("/health")
def health_check():
    return {"status": "ok", "mode": "mock" if settings.MOCK_MODE else "production"}

@app.post(f"{settings.API_V1_STR}/process-csv", status_code=status.HTTP_202_ACCEPTED, tags=["analytics"])
async def upload_and_process_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    tenant_id: str = "default"
):
    """
    Sube un archivo CSV para procesamiento analítico diferido.
    """
    # ── OWASP Security Validations ───────────────────────────────────────────
    # 1. Validar el tipo de contenido
    if file.content_type != "text/csv":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archivo inválido. Solo se permiten archivos CSV (text/csv)."
        )

    # 2. Validar tamaño máximo (Ej: 10MB) para prevenir DoS
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo es demasiado grande. El límite es 10MB."
        )
    await file.seek(0) # Resetear puntero después de leer

    # 3. Sanitizar tenant_id para prevenir inyecciones
    safe_tenant_id = "".join(c for c in tenant_id if c.isalnum() or c in "-_")

    unique_filename = f"{uuid.uuid4()}.csv"
    file_path = UPLOAD_DIR / unique_filename

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

    background_tasks.add_task(process_csv_task, str(file_path), safe_tenant_id)

    return {
        "status": "accepted",
        "message": "Archivo recibido y validado (OWASP Check Pass).",
        "file_id": unique_filename,
        "tenant_id": safe_tenant_id
    }

# ── Router Mounting ──────────────────────────────────────────────────────────
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(financial_data.router, prefix=f"{settings.API_V1_STR}/financial", tags=["financial"])
app.include_router(upload_history.router, prefix=f"{settings.API_V1_STR}/uploads", tags=["traceability"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])
app.include_router(ai_router.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai-anomalies"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])


