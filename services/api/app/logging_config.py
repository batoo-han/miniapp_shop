"""
Логирование с ротацией — общий объём логов ≤ 100 МБ.
Уровни: DEBUG, INFO, WARNING, ERROR.
"""
import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

from app.config import get_settings

settings = get_settings()
LOG_LEVEL = getattr(logging, settings.log_level.upper(), logging.INFO)
# Ротация: 3 файла по ~33 МБ ≈ 100 МБ
MAX_BYTES = int(settings.log_max_bytes_mb * 1024 * 1024 / 3)
BACKUP_COUNT = 2


def setup_logging() -> None:
    """Настройка логирования при старте приложения."""
    root = logging.getLogger()
    root.setLevel(LOG_LEVEL)
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Консоль
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)
    root.addHandler(console)

    # Файл с ротацией (если указан путь)
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    app_log = logs_dir / "app.log"
    file_handler = RotatingFileHandler(
        app_log,
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)
