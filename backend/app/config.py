from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "EE Calculator"
    APP_ENV: str = "development"
    DEBUG: bool = False

    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # CORS origins
    ALLOWED_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Execution pools
    SYNC_WORKER_POOL_SIZE: int = 2
    SYNC_TIMEOUT_SECONDS: int = 30


settings = Settings()

