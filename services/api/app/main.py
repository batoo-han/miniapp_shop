"""
Точка входа FastAPI приложения.
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.limiter import limiter
from app.logging_config import setup_logging
from app.api import router as api_router

# Логирование с ротацией (≤ 100 МБ)
setup_logging()
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="Showcase API",
    description="API витрины товаров для Telegram Mini App",
    version="0.1.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api", tags=["api"])


@app.on_event("startup")
async def startup():
    """Создание директорий при старте."""
    from pathlib import Path
    Path(settings.storage_path).mkdir(parents=True, exist_ok=True)
    logger.info("Storage path ready: %s", settings.storage_path)


@app.get("/health")
async def health():
    """Проверка работоспособности сервиса."""
    logger.debug("Health check")
    return {"status": "ok"}
