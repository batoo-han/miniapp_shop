"""
Резолвер file_id -> путь, mime, имя файла для выдачи.
Ищет в ProductImage и ProductAttachment.
"""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import ProductAttachment, ProductImage


async def resolve_file(db: AsyncSession, file_id: UUID) -> tuple[str, str | None, str] | None:
    """
    Найти файл по UUID (image или attachment).
    Возвращает (file_path, mime, filename) или None.
    """
    # Сначала ищем в images
    stmt = select(ProductImage).where(ProductImage.id == file_id)
    result = await db.execute(stmt)
    row = result.scalars().first()
    if row:
        filename = (row.file_path.split("/")[-1] or f"{file_id}.bin")
        return (row.file_path, row.mime, filename)

    # Потом в attachments
    stmt = select(ProductAttachment).where(ProductAttachment.id == file_id)
    result = await db.execute(stmt)
    row = result.scalars().first()
    if row:
        filename = row.title or (row.file_path.split("/")[-1] or f"{file_id}.bin")
        return (row.file_path, row.mime, filename)

    return None
