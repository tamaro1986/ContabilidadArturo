import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Contabilidad Arturo SaaS"
    API_V1_STR: str = "/api/v1"
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    MOCK_MODE: bool = os.getenv("MOCK_MODE", "False").lower() == "true"
    
    # Security
    CORS_ORIGINS: list[str] = [
        "https://contabilidad-arturo.vercel.app",
        "https://contabilidad-arturo-git-main-tamaro1986s-projects.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000"
    ]
    if os.getenv("CORS_ORIGINS"):
        # Permite sobrescribir desde el entorno, útil en producción
        env_origins = os.getenv("CORS_ORIGINS", "").split(",")
        CORS_ORIGINS = [o.strip() for o in env_origins if o.strip()]

    # Regex para permitir cualquier subdominio de Vercel (útil para PR previews)
    CORS_ORIGIN_REGEX: str = r"https://contabilidad-arturo.*\.vercel\.app"

    # AI / RAG Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_API_BASE: str = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "gpt-3.5-turbo")

    class Config:
        env_file = ".env"

settings = Settings()
