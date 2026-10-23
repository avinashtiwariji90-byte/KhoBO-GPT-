import os
import secrets
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Avinash GPT"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Security — MUST be set via environment variable in production
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        secrets.token_urlsafe(32)   # generates a new random key if not set; always override in prod
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database — defaults to local SQLite for development
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./ora_gpt.db"
    )

    # CORS — restrict in production by listing specific frontend origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # File upload limits (bytes) — 25 MB max
    MAX_UPLOAD_SIZE: int = 25 * 1024 * 1024
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")

    # AI Provider API Keys — loaded from .env; never hardcoded
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "llama-3.3-70b-versatile")

    # Plan message limits
    FREE_MESSAGE_LIMIT: int = 30
    FREE_FILE_LIMIT: int = 3
    BUSINESS_MESSAGE_LIMIT: int = 500
    BUSINESS_FILE_LIMIT: int = 50
    PRO_MESSAGE_LIMIT: int = 5000
    PRO_FILE_LIMIT: int = 200

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
