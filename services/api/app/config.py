"""
Конфигурация приложения из переменных окружения (.env).
Секреты — только здесь, не попадают в документацию.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки из .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # игнорировать VITE_* и др. переменные фронтенда
    )

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/showcase"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    admin_login: str = "admin"
    admin_password_hash: str = ""
    admin_password: str = ""  # для разработки; в продакшене использовать admin_password_hash
    telegram_bot_token: str = ""
    contact_telegram_link: str = "https://t.me/support"
    storage_path: str = "./storage"
    storage_max_file_size_mb: float = 50.0
    storage_allowed_image_types: str = "image/jpeg,image/png,image/webp"
    storage_allowed_attachment_types: str = "application/pdf,application/zip,application/x-rar-compressed"
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    api_port: int = 8000
    log_level: str = "INFO"
    log_max_bytes_mb: float = 100.0

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Кэшированный доступ к настройкам."""
    return Settings()
