"""
Репозиторий товаров — выборка для витрины (is_published=True).
Только параметризованные запросы — защита от SQL injection.
"""
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product


async def list_products(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    sort: str = "sort_order",
) -> tuple[list[Product], int]:
    """
    Список опубликованных товаров с пагинацией.
    Возвращает (список, total).
    """
    # Подсчёт total
    count_stmt = select(func.count()).select_from(Product).where(Product.is_published == True)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Сортировка
    order_col = getattr(Product, sort, Product.sort_order)
    stmt = (
        select(Product)
        .where(Product.is_published == True)
        .order_by(order_col)
        .offset((page - 1) * per_page)
        .limit(per_page)
        .options(selectinload(Product.images), selectinload(Product.attachments), selectinload(Product.specs))
    )
    result = await db.execute(stmt)
    products = list(result.scalars().all())
    return products, total


async def get_product_by_slug(db: AsyncSession, slug: str) -> Product | None:
    """Товар по slug (только опубликованный)."""
    stmt = (
        select(Product)
        .where(Product.slug == slug, Product.is_published == True)
        .options(selectinload(Product.images), selectinload(Product.attachments), selectinload(Product.specs))
    )
    result = await db.execute(stmt)
    return result.scalars().first()
