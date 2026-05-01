from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, financial_data, analytics
import duckdb

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configuración de CORS relajada para debug
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    if settings.MOCK_MODE:
        print("--- RUNNING IN MOCK MODE ---")
        import duckdb
        from app.services import duckdb_client
        duckdb_client.mock_con = duckdb.connect(':memory:')
        from app.db.mock_data import init_mock_duckdb
        init_mock_duckdb(duckdb_client.mock_con)

"""
Retorna la conexión de DuckDB. En MOCK_MODE usa la instancia global.
"""
def get_duckdb_client() -> duckdb.DuckDBPyConnection:
    from app.main import app
    if settings.MOCK_MODE and hasattr(app.state, 'duck_con'):
        return app.state.duck_con

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(financial_data.router, prefix=f"{settings.API_V1_STR}/financial", tags=["financial"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])

@app.get("/")
def root():
    return {"message": "Welcome to Contabilidad SaaS API"}
