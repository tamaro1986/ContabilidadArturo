from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, financial_data, analytics, ai as ai_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# ── CORS Configuration ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    return {"message": "Contabilidad Arturo API is running", "status": "online"}

@app.get("/health")
def health_check():
    return {"status": "ok", "mode": "mock" if settings.MOCK_MODE else "production"}

# ── Router Mounting ──────────────────────────────────────────────────────────
# Prefijo oficial: /api/v1
# El frontend debe estar configurado para usar este prefijo en su API_URL.
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(financial_data.router, prefix=f"{settings.API_V1_STR}/financial", tags=["financial"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])
app.include_router(ai_router.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai-anomalies"])

# Fin de configuración de rutas

