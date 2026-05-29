import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

# Compute absolute path to .env relative to this file (backend/app/core/config.py → backend/.env)
_ENV_FILE = str(Path(__file__).resolve().parent.parent.parent / ".env")

class Settings(BaseSettings):
    # Proyecto
    PROJECT_NAME: str = "Contabilidad Arturo SaaS"
    API_V1_STR: str = "/api/v1"
    
    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    NEXT_PUBLIC_SUPABASE_URL: str = ""
    NEXT_PUBLIC_SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    # URLs
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Base de Datos (HTAP)
    DATABASE_URL: str = ""
    DIRECT_URL: str = ""
    
    # Cache y Mock
    REDIS_URL: str = "redis://localhost:6379/0"
    MOCK_MODE: bool = False
    
    # Seguridad (CORS)
    CORS_ORIGINS: List[str] = [
        "https://contabilidadarturo.vercel.app",
        "https://contabilidad-arturo.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
    ]
    
    CORS_ORIGIN_REGEX: str = r"https://contabilidad-?arturo.*\.vercel\.app"

    # AI / RAG Configuration
    OPENAI_API_KEY: str = ""
    OPENAI_API_BASE: str = "https://api.openai.com/v1"
    LLM_MODEL_NAME: str = "gpt-3.5-turbo"

    # Configuración de Pydantic v2
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        case_sensitive=True,
        extra="ignore"  # Ignora variables extra en el .env para evitar ValidationErrors
    )

settings = Settings()
