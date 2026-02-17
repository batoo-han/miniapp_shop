"""
Абстракция хранилища файлов — для локального диска и будущего S3.
"""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO


class StorageDriver(ABC):
    """Базовый интерфейс хранилища файлов."""

    @abstractmethod
    async def save(self, relative_path: str, content: BinaryIO, content_type: str | None = None) -> int:
        """
        Сохранить файл по относительному пути.
        Возвращает размер в байтах.
        """
        ...

    @abstractmethod
    async def read(self, relative_path: str) -> bytes | None:
        """Прочитать файл по относительному пути."""
        ...

    @abstractmethod
    async def delete(self, relative_path: str) -> bool:
        """Удалить файл. Возвращает True если удалён."""
        ...

    @abstractmethod
    async def exists(self, relative_path: str) -> bool:
        """Проверить существование файла."""
        ...

    def get_absolute_path(self, relative_path: str) -> str:
        """
        Вернуть полный путь (для локального хранилища) или URL (для S3).
        В S3-реализации вернёт presigned URL или публичный URL.
        """
        raise NotImplementedError
