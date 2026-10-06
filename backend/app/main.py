import logging
import uuid
from contextlib import asynccontextmanager

import duckdb
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import (
    admin,
    ai as ai_router,
    analytics,
    auth,
    financial_data,
    reports,
    tenants,
    upload_history,
)
from app.core.config import settings
from app.core.errors import (
    ApiException,
    api_exception_handler,
    legacy_http_exception_handler,
)
from app.services.cache import redis_client
from app.services.duckdb_client import get_duckdb_client

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.MOCK_MODE:
        logger.info("Running in mock mode")
        from app.db.mock_data import init_mock_duckdb
        from app.services import duckdb_client

        duckdb_client.mock_con = duckdb.connect(":memory:")
        init_mock_duckdb(duckdb_client.mock_con)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)
app.add_exception_handler(ApiException, api_exception_handler)
app.add_exception_handler(HTTPException, legacy_http_exception_handler)

clean_origins = [str(origin).rstrip("/") for origin in settings.CORS_ORIGINS]
app.add_middleware(
    CORSMiddleware,
    allow_origins=clean_origins,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Mock-Tenant-ID",
        "X-Request-ID",
    ],
    expose_headers=["X-Request-ID"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/")
def read_root():
    return {"message": f"{settings.PROJECT_NAME} is running", "status": "online"}


@app.get("/health")
@app.get("/health/live")
def health_live():
    return {
        "status": "ok",
        "mode": "mock" if settings.MOCK_MODE else "production",
    }


@app.get("/health/ready")
def health_ready():
    failures: list[str] = []

    if not settings.MOCK_MODE:
        if not (settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY):
            failures.append("supabase")
        if not (settings.DATABASE_URL or settings.DIRECT_URL):
            failures.append("database_config")

        try:
            if redis_client is None or not redis_client.ping():
                failures.append("redis")
        except Exception:
            logger.exception("Redis readiness check failed")
            failures.append("redis")

        database = get_duckdb_client()
        try:
            database.execute("SELECT 1").fetchone()
        except Exception:
            logger.exception("Database readiness check failed")
            failures.append("database")
        finally:
            database.close()

    if failures:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "checks_failed": sorted(set(failures)),
            },
        )

    return {"status": "ready"}


app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(
    financial_data.router,
    prefix=f"{settings.API_V1_STR}/financial",
    tags=["financial"],
)
app.include_router(
    upload_history.router,
    prefix=f"{settings.API_V1_STR}/uploads",
    tags=["traceability"],
)
app.include_router(
    analytics.router,
    prefix=f"{settings.API_V1_STR}/analytics",
    tags=["analytics"],
)
app.include_router(
    ai_router.router,
    prefix=f"{settings.API_V1_STR}/ai",
    tags=["ai-anomalies"],
)
app.include_router(
    reports.router,
    prefix=f"{settings.API_V1_STR}/reports",
    tags=["reports"],
)
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(
    tenants.router,
    prefix=f"{settings.API_V1_STR}/tenant",
    tags=["tenant"],
)
