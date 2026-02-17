"""
API товаров — публичные эндпоинты для витрины.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.product import Product
from app.repositories.product import get_product_by_slug, list_products as repo_list_products
from app.schemas.product import (
    ProductAttachmentOut,
    ProductDetail,
    ProductImageOut,
    ProductListItem,
    ProductListResponse,
    ProductSpecOut,
)

router = APIRouter()


def _file_url(file_id: UUID) -> str:
    """URL файла (относительный)."""
    return f"/api/files/{file_id}"


@router.get("/", response_model=ProductListResponse)
async def list_products(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort: str = Query("sort_order"),
):
    """Список опубликованных товаров с пагинацией."""
    products, total = await repo_list_products(db, page=page, per_page=per_page, sort=sort)

    items = []
    for p in products:
        image_url = None
        if p.images:
            img = sorted(p.images, key=lambda x: x.sort_order)[0]
            image_url = _file_url(img.id)
        items.append(
            ProductListItem(
                id=p.id,
                slug=p.slug,
                title=p.title,
                short_description=p.short_description,
                price_amount=p.price_amount,
                price_currency=p.price_currency,
                image_url=image_url,
            )
        )

    return ProductListResponse(items=items, total=total, page=page, per_page=per_page)


@router.post("/{slug}/view")
async def increment_product_view(slug: str, db: AsyncSession = Depends(get_db)):
    """
    Инкремент счётчика просмотров товара.
    Вызывается при открытии карточки (без авторизации).
    """
    stmt = select(Product).where(Product.slug == slug, Product.is_published == True)
    result = await db.execute(stmt)
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.view_count = (product.view_count or 0) + 1
    await db.flush()
    return {"view_count": product.view_count}


@router.get("/{slug}", response_model=ProductDetail)
async def get_product(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Карточка товара по slug."""
    product = await get_product_by_slug(db, slug)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    images = [
        ProductImageOut(
            id=img.id,
            alt=img.alt,
            sort_order=img.sort_order,
            url=_file_url(img.id),
        )
        for img in sorted(product.images, key=lambda x: x.sort_order)
    ]
    attachments = [
        ProductAttachmentOut(
            id=att.id,
            title=att.title,
            sort_order=att.sort_order,
            url=_file_url(att.id),
            mime=att.mime,
            size_bytes=att.size_bytes,
        )
        for att in sorted(product.attachments, key=lambda x: x.sort_order)
    ]
    specs = [
        ProductSpecOut(
            id=s.id,
            name=s.name,
            value=s.value,
            unit=s.unit,
            sort_order=s.sort_order,
        )
        for s in sorted(product.specs, key=lambda x: x.sort_order)
    ]

    return ProductDetail(
        id=product.id,
        slug=product.slug,
        title=product.title,
        description=product.description,
        short_description=product.short_description,
        price_amount=product.price_amount,
        price_currency=product.price_currency,
        images=images,
        attachments=attachments,
        specs=specs,
    )
