"""
Схемы для админ API.
"""
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    """Запрос логина."""

    login: str
    password: str


class LoginResponse(BaseModel):
    """Ответ логина — JWT."""

    access_token: str
    token_type: str = "bearer"


class ProductCreate(BaseModel):
    """Создание товара."""

    slug: str
    title: str
    sku: str | None = None
    manufacturer: str | None = None
    category_id: UUID | None = None
    short_description: str | None = None
    description: str | None = None
    price_amount: Decimal | None = None
    price_currency: str | None = "RUB"
    is_published: bool = False
    sort_order: int = 0


class ProductUpdate(BaseModel):
    """Обновление товара (все поля опциональны)."""

    slug: str | None = None
    title: str | None = None
    sku: str | None = None
    manufacturer: str | None = None
    category_id: UUID | None = None
    short_description: str | None = None
    description: str | None = None
    price_amount: Decimal | None = None
    price_currency: str | None = None
    is_published: bool | None = None
    sort_order: int | None = None


class CategoryCreate(BaseModel):
    """Создание категории."""

    name: str
    slug: str
    sort_order: int = 0
    parent_id: UUID | None = None


class CategoryUpdate(BaseModel):
    """Обновление категории."""

    name: str | None = None
    slug: str | None = None
    sort_order: int | None = None
    parent_id: UUID | None = None


class VariantCreate(BaseModel):
    """Добавление варианта товара."""

    option_name: str
    option_value: str
    stock_qty: int = 0
    in_order_qty: int = 0
    sort_order: int = 0


class VariantUpdate(BaseModel):
    """Обновление варианта."""

    option_name: str | None = None
    option_value: str | None = None
    stock_qty: int | None = None
    in_order_qty: int | None = None
    sort_order: int | None = None


class SpecCreate(BaseModel):
    """Добавление ТТХ."""

    name: str
    value: str
    unit: str | None = None
    sort_order: int = 0


class SpecUpdate(BaseModel):
    """Обновление ТТХ."""

    name: str | None = None
    value: str | None = None
    unit: str | None = None
    sort_order: int | None = None


class ImageSortUpdate(BaseModel):
    """Обновление порядка изображения."""

    sort_order: int


class SettingsResponse(BaseModel):
    """Ответ с настройками (read-only для секретов, editable для безопасных)."""

    # Безопасные настройки (редактируемые)
    contact_telegram_link: str
    storage_max_file_size_mb: float
    storage_allowed_image_types: str
    storage_allowed_attachment_types: str
    log_level: str
    log_max_bytes_mb: float
    # Настройки мини-приложения магазина
    miniapp_shop_name: str
    miniapp_section_title: str
    miniapp_footer_text: str
    miniapp_background_color: str
    miniapp_background_image: str

    # Только для чтения (секреты и системные)
    api_port: int
    cors_origins: str
    storage_path: str


class SettingsUpdate(BaseModel):
    """Обновление безопасных настроек."""

    contact_telegram_link: str | None = None
    storage_max_file_size_mb: float | None = None
    storage_allowed_image_types: str | None = None
    storage_allowed_attachment_types: str | None = None
    log_level: str | None = None
    log_max_bytes_mb: float | None = None
    # Настройки мини-приложения магазина
    miniapp_shop_name: str | None = None
    miniapp_section_title: str | None = None
    miniapp_footer_text: str | None = None
    miniapp_background_color: str | None = None
    miniapp_background_image: str | None = None


class MiniappSettingsResponse(BaseModel):
    """Публичные настройки для мини-приложения (без секретов)."""

    shop_name: str
    section_title: str
    footer_text: str
    background_color: str
    background_image: str
    contact_telegram_link: str
