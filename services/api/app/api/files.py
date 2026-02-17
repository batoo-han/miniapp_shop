"""
API выдачи файлов — GET /api/files/{file_id}.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.services.file_resolver import resolve_file
from app.storage.local import get_storage

router = APIRouter()


@router.get("/{file_id}")
async def get_file(
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Выдать файл по ID (image или attachment).
    Content-Type и Content-Disposition устанавливаются из метаданных.
    """
    resolved = await resolve_file(db, file_id)
    if not resolved:
        raise HTTPException(status_code=404, detail="File not found")

    file_path, mime, filename = resolved
    storage = get_storage()
    abs_path = storage.get_absolute_path(file_path)

    try:
        # Используем FileResponse для потоковой выдачи
        return FileResponse(
            path=abs_path,
            media_type=mime or "application/octet-stream",
            filename=filename,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found on disk")
