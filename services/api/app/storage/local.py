"""
Локальное хранение файлов на диске.
Структура: storage/products/{product_id}/images/{image_id}/filename
           storage/products/{product_id}/attachments/{attachment_id}/filename
"""
import asyncio
from pathlib import Path
from typing import BinaryIO

from app.config import get_settings
from app.storage.base import StorageDriver

settings = get_settings()


class LocalStorageDriver(StorageDriver):
    """Локальный диск — хранение в директории storage_path."""

    def __init__(self, base_path: str | None = None):
        self._base = Path(base_path or settings.storage_path)
        self._base.mkdir(parents=True, exist_ok=True)

    def _full_path(self, relative_path: str) -> Path:
        """Полный путь к файлу (защита от path traversal)."""
        full = (self._base / relative_path).resolve()
        base_resolved = self._base.resolve()
        if not str(full).startswith(str(base_resolved)):
            raise ValueError("Path traversal not allowed")
        return full

    async def save(self, relative_path: str, content: BinaryIO, content_type: str | None = None) -> int:
        """Сохранить файл, создать директории при необходимости."""
        path = self._full_path(relative_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        data = content.read()
        await asyncio.to_thread(path.write_bytes, data)
        return len(data)

    async def read(self, relative_path: str) -> bytes | None:
        """Прочитать файл."""
        path = self._full_path(relative_path)
        if not path.exists():
            return None
        return await asyncio.to_thread(path.read_bytes)

    async def delete(self, relative_path: str) -> bool:
        """Удалить файл."""
        path = self._full_path(relative_path)
        if not path.exists():
            return False
        await asyncio.to_thread(path.unlink)
        return True

    async def exists(self, relative_path: str) -> bool:
        """Проверить существование."""
        path = self._full_path(relative_path)
        return path.exists()

    def get_absolute_path(self, relative_path: str) -> str:
        """Полный путь на диске (для локальной выдачи через API)."""
        return str(self._full_path(relative_path))


def get_storage() -> LocalStorageDriver:
    """Фабрика драйвера хранилища (v1 — локальный)."""
    return LocalStorageDriver(settings.storage_path)
