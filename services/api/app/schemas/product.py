"""
Схемы Product для API (витрина).
"""
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProductImageOut(BaseModel):
    """Изображение в ответе."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    alt: str | None = None
    sort_order: int
    url: str  # /api/files/{id}


class ProductAttachmentOut(BaseModel):
    """Прикреплённый файл в ответе."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    sort_order: int
    url: str  # /api/files/{id}
    mime: str | None = None
    size_bytes: int | None = None


class ProductSpecOut(BaseModel):
    """ТТХ в ответе."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    value: str
    unit: str | None = None
    sort_order: int


class ProductListItem(BaseModel):
    """Элемент списка товаров."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    title: str
    short_description: str | None = None
    price_amount: Decimal | None = None
    price_currency: str | None = None
    image_url: str | None = None  # первое изображение


class ProductDetail(BaseModel):
    """Карточка товара."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    title: str
    description: str | None = None
    short_description: str | None = None
    price_amount: Decimal | None = None
    price_currency: str | None = None
    images: list[ProductImageOut]
    attachments: list[ProductAttachmentOut]
    specs: list[ProductSpecOut]


class ProductListResponse(BaseModel):
    """Ответ списка товаров с пагинацией."""

    items: list[ProductListItem]
    total: int
    page: int
    per_page: int
