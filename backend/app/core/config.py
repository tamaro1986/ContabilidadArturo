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
    MOCK_MODE: bool = True
    
    # Security
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "*").split(",")

    # AI / RAG Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_API_BASE: str = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "gpt-3.5-turbo")

    class Config:
        env_file = ".env"

settings = Settings()
