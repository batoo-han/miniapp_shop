"""
Слой хранения файлов (абстракция для локального диска и будущего S3).
"""
from app.storage.base import StorageDriver
from app.storage.local import LocalStorageDriver

__all__ = ["StorageDriver", "LocalStorageDriver"]
