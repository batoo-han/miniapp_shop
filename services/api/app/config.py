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
    # Настройки мини-приложения магазина
    miniapp_section_title: str = "Витрина"
    miniapp_footer_text: str = "@TestoSmaipl_bot"
    miniapp_background_color: str = "#000000"
    miniapp_background_image: str = ""  # URL или путь к изображению фона
    # Цвета текста для читаемости на фоне
    miniapp_text_color: str = "#ffffff"  # Основной цвет текста
    miniapp_heading_color: str = "#ffffff"  # Цвет заголовков
    miniapp_price_color: str = "#00d4ff"  # Цвет цен
    miniapp_hint_color: str = "#cccccc"  # Цвет подсказок/вторичного текста
    miniapp_card_bg_color: str = "rgba(255, 255, 255, 0.1)"  # Цвет фона карточек товаров

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        # Telegram: sandboxed iframe (origin "null") и web.telegram.org
        extras = ["null", "https://web.telegram.org", "https://web.telegram.k.org"]
        for e in extras:
            if e not in origins and "*" not in origins:
                origins.append(e)
        return origins


@lru_cache
def get_settings() -> Settings:
    """Кэшированный доступ к настройкам."""
    return Settings()
