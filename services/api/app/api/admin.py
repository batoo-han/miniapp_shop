"""
Админ API — CRUD товаров, загрузка файлов.
"""
import io
import logging
import re
import uuid
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import passlib.exc

from app.api.admin_auth import create_access_token, require_admin, verify_password
from app.config import get_settings
from app.db import get_db
from app.models.product import Product, ProductAttachment, ProductCategory, ProductImage, ProductSpec, ProductVariant
from app.limiter import limiter
from app.schemas.admin import (
    CategoryCreate,
    CategoryUpdate,
    ImageSortUpdate,
    LoginRequest,
    LoginResponse,
    ProductCreate,
    ProductUpdate,
    SettingsResponse,
    SettingsUpdate,
    SpecCreate,
    SpecUpdate,
    VariantCreate,
    VariantUpdate,
)
from app.storage.local import get_storage

# Роутер для логина (без JWT)
router_public = APIRouter()

# Роутер для CRUD (с JWT)
router = APIRouter(dependencies=[Depends(require_admin)])
settings = get_settings()

# Разрешённые MIME для загрузки
ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_ATTACHMENT = {"application/pdf", "application/zip", "application/x-rar-compressed"}
MAX_FILE_MB = 50


def _check_password(password: str) -> bool:
    """Проверка пароля админа."""
    if settings.admin_password_hash and settings.admin_password_hash.startswith(("$2a$", "$2b$")):
        try:
            return verify_password(password, settings.admin_password_hash)
        except passlib.exc.UnknownHashError:
            logging.getLogger(__name__).warning("ADMIN_PASSWORD_HASH invalid, falling back to ADMIN_PASSWORD")
    if settings.admin_password:
        return password == settings.admin_password
    return False


def _slugify(s: str) -> str:
    """Преобразование в slug."""
    s = s.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[-\s]+", "-", s)
    return s[:255]


# --- Login (без JWT, rate-limit: 5 попыток в минуту) ---
@router_public.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, data: LoginRequest):
    """Логин админа, возврат JWT."""
    try:
        if data.login != settings.admin_login:
            raise HTTPException(status_code=401, detail="Invalid login or password")
        if not _check_password(data.password):
            raise HTTPException(status_code=401, detail="Invalid login or password")
        token = create_access_token(data.login)
        return LoginResponse(access_token=token)
    except HTTPException:
        raise
    except Exception:
        logging.getLogger(__name__).exception("Login error")
        raise HTTPException(status_code=500, detail="Internal server error")


# --- Products CRUD ---
@router.get("/products")
async def admin_list_products(
    db: AsyncSession = Depends(get_db),
    search: str | None = None,
    category_id: UUID | None = None,
    is_published: bool | None = None,
    manufacturer: str | None = None,
    page: int = 1,
    per_page: int = 50,
    sort_by: str = "sort_order",
    sort_order: str = "asc",
):
    """Список товаров с фильтрами, сортировкой и пагинацией."""
    filters = []
    if search:
        search_pattern = f"%{search}%"
        filters.append(or_(Product.title.ilike(search_pattern), Product.sku.ilike(search_pattern)))
    if category_id is not None:
        filters.append(Product.category_id == category_id)
    if is_published is not None:
        filters.append(Product.is_published == is_published)
    if manufacturer:
        filters.append(Product.manufacturer == manufacturer)

    base_stmt = select(Product)
    if filters:
        base_stmt = base_stmt.where(*filters)

    count_stmt = select(func.count()).select_from(Product)
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = (await db.execute(count_stmt)).scalar() or 0

    # Маппинг полей сортировки
    sort_columns = {
        "sort_order": Product.sort_order,
        "sku": Product.sku,
        "price": Product.price_amount,
        "manufacturer": Product.manufacturer,
        "status": Product.is_published,
        "views": Product.view_count,
        "title": Product.title,
    }

    # Получаем колонку для сортировки (по умолчанию sort_order)
    sort_column = sort_columns.get(sort_by, Product.sort_order)

    # Направление сортировки
    if sort_order == "desc":
        order_clause = sort_column.desc().nulls_last()
    else:
        order_clause = sort_column.asc().nulls_last()

    stmt = (
        base_stmt
        .options(selectinload(Product.images), selectinload(Product.category), selectinload(Product.variants))
        .order_by(order_clause, Product.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    result = await db.execute(stmt)
    products = result.scalars().all()

    def first_image_url(p):
        imgs = sorted(p.images, key=lambda x: x.sort_order)
        return f"/api/files/{imgs[0].id}" if imgs else None

    return {
        "items": [
            {
                "id": str(p.id),
                "slug": p.slug,
                "title": p.title,
                "sku": p.sku,
                "manufacturer": p.manufacturer,
                "category_id": str(p.category_id) if p.category_id else None,
                "category_name": p.category.name if p.category else None,
                "price_amount": float(p.price_amount) if p.price_amount else None,
                "price_currency": p.price_currency,
                "is_published": p.is_published,
                "sort_order": p.sort_order,
                "view_count": p.view_count,
                "image_url": first_image_url(p),
                "variants": [{"id": str(v.id), "option_name": v.option_name, "option_value": v.option_value, "stock_qty": v.stock_qty, "in_order_qty": v.in_order_qty} for v in sorted(p.variants, key=lambda x: x.sort_order)],
            }
            for p in products
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.post("/products")
async def admin_create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
):
    """Создание товара."""
    product = Product(
        slug=data.slug,
        title=data.title,
        sku=data.sku,
        manufacturer=data.manufacturer,
        category_id=data.category_id,
        short_description=data.short_description,
        description=data.description,
        price_amount=data.price_amount,
        price_currency=data.price_currency,
        is_published=data.is_published,
        sort_order=data.sort_order,
    )
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return {"id": str(product.id), "slug": product.slug}


@router.get("/products/{product_id}")
async def admin_get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Получение товара для редактирования."""
    stmt = (
        select(Product)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.images),
            selectinload(Product.attachments),
            selectinload(Product.specs),
            selectinload(Product.category),
            selectinload(Product.variants),
        )
    )
    result = await db.execute(stmt)
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    def file_url(fid: UUID) -> str:
        return f"/api/files/{fid}"

    return {
        "id": str(product.id),
        "slug": product.slug,
        "title": product.title,
        "sku": product.sku,
        "manufacturer": product.manufacturer,
        "category_id": str(product.category_id) if product.category_id else None,
        "view_count": product.view_count,
        "short_description": product.short_description,
        "description": product.description,
        "price_amount": float(product.price_amount) if product.price_amount else None,
        "price_currency": product.price_currency,
        "is_published": product.is_published,
        "sort_order": product.sort_order,
        "images": [{"id": str(i.id), "url": file_url(i.id), "alt": i.alt, "sort_order": i.sort_order} for i in sorted(product.images, key=lambda x: x.sort_order)],
        "attachments": [{"id": str(a.id), "title": a.title, "url": file_url(a.id), "sort_order": a.sort_order} for a in sorted(product.attachments, key=lambda x: x.sort_order)],
        "specs": [{"id": str(s.id), "name": s.name, "value": s.value, "unit": s.unit, "sort_order": s.sort_order} for s in sorted(product.specs, key=lambda x: x.sort_order)],
        "variants": [{"id": str(v.id), "option_name": v.option_name, "option_value": v.option_value, "stock_qty": v.stock_qty, "in_order_qty": v.in_order_qty, "sort_order": v.sort_order} for v in sorted(product.variants, key=lambda x: x.sort_order)],
    }


@router.put("/products/{product_id}")
async def admin_update_product(
    product_id: UUID,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Обновление товара."""
    stmt = select(Product).where(Product.id == product_id)
    result = await db.execute(stmt)
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    updates = data.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(product, k, v)
    await db.flush()
    return {"id": str(product.id)}


@router.delete("/products/{product_id}")
async def admin_delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Удаление товара (каскадно удаляет images, attachments, specs)."""
    stmt = select(Product).where(Product.id == product_id)
    result = await db.execute(stmt)
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
    return {"deleted": str(product_id)}


# --- Statistics ---
@router.get("/stats")
async def admin_stats(db: AsyncSession = Depends(get_db)):
    """Статистика: всего товаров, опубликовано, просмотры."""
    from sqlalchemy import func

    total_stmt = select(func.count()).select_from(Product)
    published_stmt = select(func.count()).select_from(Product).where(Product.is_published == True)
    views_stmt = select(func.coalesce(func.sum(Product.view_count), 0)).select_from(Product)

    total = (await db.execute(total_stmt)).scalar() or 0
    published = (await db.execute(published_stmt)).scalar() or 0
    total_views = (await db.execute(views_stmt)).scalar() or 0
    return {"total_products": total, "published_count": published, "total_views": int(total_views)}


# --- Categories ---
@router.get("/categories")
async def admin_list_categories(db: AsyncSession = Depends(get_db)):
    """Список категорий."""
    stmt = select(ProductCategory).order_by(ProductCategory.sort_order, ProductCategory.name)
    result = await db.execute(stmt)
    categories = result.scalars().all()
    return [{"id": str(c.id), "name": c.name, "slug": c.slug, "sort_order": c.sort_order, "parent_id": str(c.parent_id) if c.parent_id else None} for c in categories]


@router.post("/categories")
async def admin_create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    """Создание категории."""
    category = ProductCategory(
        name=data.name,
        slug=data.slug,
        sort_order=data.sort_order,
        parent_id=data.parent_id,
    )
    db.add(category)
    await db.flush()
    await db.refresh(category)
    return {"id": str(category.id), "slug": category.slug}


@router.put("/categories/{category_id}")
async def admin_update_category(
    category_id: UUID,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Обновление категории."""
    stmt = select(ProductCategory).where(ProductCategory.id == category_id)
    result = await db.execute(stmt)
    category = result.scalars().first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    updates = data.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(category, k, v)
    await db.flush()
    return {"id": str(category.id)}


@router.delete("/categories/{category_id}")
async def admin_delete_category(category_id: UUID, db: AsyncSession = Depends(get_db)):
    """Удаление категории."""
    stmt = select(ProductCategory).where(ProductCategory.id == category_id)
    result = await db.execute(stmt)
    category = result.scalars().first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(category)
    return {"deleted": str(category_id)}


# --- Manufacturers (для фильтра) ---
@router.get("/manufacturers")
async def admin_list_manufacturers(db: AsyncSession = Depends(get_db)):
    """Список уникальных производителей."""
    stmt = select(Product.manufacturer).where(Product.manufacturer.isnot(None)).distinct().order_by(Product.manufacturer)
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


# --- Variants ---
@router.post("/products/{product_id}/variants")
async def admin_add_variant(
    product_id: UUID,
    data: VariantCreate,
    db: AsyncSession = Depends(get_db),
):
    """Добавление варианта товара."""
    stmt = select(Product).where(Product.id == product_id)
    result = await db.execute(stmt)
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    variant = ProductVariant(
        product_id=product_id,
        option_name=data.option_name,
        option_value=data.option_value,
        stock_qty=data.stock_qty,
        in_order_qty=data.in_order_qty,
        sort_order=data.sort_order,
    )
    db.add(variant)
    await db.flush()
    return {"id": str(variant.id)}


@router.put("/products/{product_id}/variants/{variant_id}")
async def admin_update_variant(
    product_id: UUID,
    variant_id: UUID,
    data: VariantUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Обновление варианта."""
    stmt = select(ProductVariant).where(
        ProductVariant.id == variant_id,
        ProductVariant.product_id == product_id,
    )
    result = await db.execute(stmt)
    variant = result.scalars().first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    updates = data.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(variant, k, v)
    await db.flush()
    return {"id": str(variant.id)}


@router.delete("/products/{product_id}/variants/{variant_id}")
async def admin_delete_variant(
    product_id: UUID,
    variant_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Удаление варианта."""
    stmt = select(ProductVariant).where(
        ProductVariant.id == variant_id,
        ProductVariant.product_id == product_id,
    )
    result = await db.execute(stmt)
    variant = result.scalars().first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    await db.delete(variant)
    return {"deleted": str(variant_id)}


# --- Images ---
@router.post("/products/{product_id}/images")
async def admin_upload_image(
    product_id: UUID,
    file: UploadFile = File(...),
    alt: str = Form(""),
    sort_order: int = Form(0),
    db: AsyncSession = Depends(get_db),
):
    """Загрузка изображения товара."""
    if file.content_type not in ALLOWED_IMAGE:
        raise HTTPException(status_code=400, detail=f"Allowed types: {ALLOWED_IMAGE}")
    content = await file.read()
    if len(content) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Max size {MAX_FILE_MB}MB")

    stmt = select(Product).where(Product.id == product_id)
    result = await db.execute(stmt)
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    img_id = uuid.uuid4()
    ext = Path(file.filename or "img").suffix or ".jpg"
    rel_path = f"products/{product_id}/images/{img_id}{ext}"

    storage = get_storage()
    await storage.save(rel_path, io.BytesIO(content), file.content_type)

    img = ProductImage(
        id=img_id,
        product_id=product_id,
        file_path=rel_path,
        alt=alt or None,
        sort_order=sort_order,
        mime=file.content_type,
        size_bytes=len(content),
    )
    db.add(img)
    await db.flush()
    return {"id": str(img_id), "url": f"/api/files/{img_id}"}


# --- Attachments ---
@router.post("/products/{product_id}/attachments")
async def admin_upload_attachment(
    product_id: UUID,
    file: UploadFile = File(...),
    title: str = Form(""),
    sort_order: int = Form(0),
    db: AsyncSession = Depends(get_db),
):
    """Загрузка прикреплённого файла."""
    if file.content_type not in ALLOWED_ATTACHMENT:
        raise HTTPException(status_code=400, detail=f"Allowed types: {ALLOWED_ATTACHMENT}")
    content = await file.read()
    if len(content) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Max size {MAX_FILE_MB}MB")

    stmt = select(Product).where(Product.id == product_id)
    result = await db.execute(stmt)
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    att_id = uuid.uuid4()
    ext = Path(file.filename or "file").suffix
    rel_path = f"products/{product_id}/attachments/{att_id}{ext}"

    storage = get_storage()
    await storage.save(rel_path, io.BytesIO(content), file.content_type)

    att = ProductAttachment(
        id=att_id,
        product_id=product_id,
        file_path=rel_path,
        title=title or file.filename or "Attachment",
        mime=file.content_type,
        size_bytes=len(content),
        sort_order=sort_order,
    )
    db.add(att)
    await db.flush()
    return {"id": str(att_id), "url": f"/api/files/{att_id}"}


# --- Specs ---
@router.post("/products/{product_id}/specs")
async def admin_add_spec(
    product_id: UUID,
    data: SpecCreate,
    db: AsyncSession = Depends(get_db),
):
    """Добавление ТТХ."""
    stmt = select(Product).where(Product.id == product_id)
    result = await db.execute(stmt)
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    spec = ProductSpec(
        product_id=product_id,
        name=data.name,
        value=data.value,
        unit=data.unit,
        sort_order=data.sort_order,
    )
    db.add(spec)
    await db.flush()
    return {"id": str(spec.id)}


@router.put("/products/{product_id}/specs/{spec_id}")
async def admin_update_spec(
    product_id: UUID,
    spec_id: UUID,
    data: SpecUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Обновление ТТХ."""
    stmt = select(ProductSpec).where(
        ProductSpec.id == spec_id,
        ProductSpec.product_id == product_id,
    )
    result = await db.execute(stmt)
    spec = result.scalars().first()
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")
    updates = data.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(spec, k, v)
    await db.flush()
    return {"id": str(spec.id)}


@router.delete("/products/{product_id}/specs/{spec_id}")
async def admin_delete_spec(
    product_id: UUID,
    spec_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Удаление ТТХ."""
    stmt = select(ProductSpec).where(
        ProductSpec.id == spec_id,
        ProductSpec.product_id == product_id,
    )
    result = await db.execute(stmt)
    spec = result.scalars().first()
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")
    await db.delete(spec)
    return {"deleted": str(spec_id)}


@router.put("/products/{product_id}/images/{image_id}")
async def admin_update_image_sort(
    product_id: UUID,
    image_id: UUID,
    data: ImageSortUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Обновление порядка изображения."""
    stmt = select(ProductImage).where(
        ProductImage.id == image_id,
        ProductImage.product_id == product_id,
    )
    result = await db.execute(stmt)
    img = result.scalars().first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    img.sort_order = data.sort_order
    await db.flush()
    return {"id": str(image_id)}


@router.delete("/files/{file_id}")
async def admin_delete_file(
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Удаление файла (image или attachment)."""
    from app.models.product import ProductAttachment, ProductImage

    for model, attr in [(ProductImage, "images"), (ProductAttachment, "attachments")]:
        stmt = select(model).where(model.id == file_id)
        result = await db.execute(stmt)
        row = result.scalars().first()
        if row:
            storage = get_storage()
            await storage.delete(row.file_path)
            await db.delete(row)
            return {"deleted": str(file_id)}
    raise HTTPException(status_code=404, detail="File not found")


# --- Settings Background Image ---
@router.post("/settings/background-image")
async def admin_upload_background_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Загрузка фонового изображения для мини-приложения."""
    if file.content_type not in ALLOWED_IMAGE:
        logging.getLogger(__name__).warning("Background image rejected: content_type=%s", file.content_type)
        raise HTTPException(
            status_code=400,
            detail="Допустимые форматы: JPEG, PNG, WebP. Загруженный файл имеет другой тип.",
        )
    content = await file.read()
    if len(content) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Максимальный размер файла: {MAX_FILE_MB} МБ.",
        )

    # Удаляем старое изображение, если есть
    s = get_settings()
    if s.miniapp_background_image and s.miniapp_background_image.startswith("/api/files/"):
        # Извлекаем UUID из пути /api/files/{uuid}
        try:
            old_file_id = UUID(s.miniapp_background_image.replace("/api/files/", ""))
            # Удаляем старый файл
            from app.models.product import ProductImage
            stmt = select(ProductImage).where(ProductImage.id == old_file_id)
            result = await db.execute(stmt)
            old_img = result.scalars().first()
            if old_img:
                storage = get_storage()
                await storage.delete(old_img.file_path)
                await db.delete(old_img)
                await db.flush()
        except (ValueError, Exception):
            # Игнорируем ошибки при удалении старого файла
            pass

    # Сохраняем новое изображение напрямую в хранилище
    img_id = uuid.uuid4()
    ext = Path(file.filename or "img").suffix or ".jpg"
    rel_path = f"settings/background_{img_id}{ext}"

    storage = get_storage()
    await storage.save(rel_path, io.BytesIO(content), file.content_type)
    
    # Создаём запись ProductImage для совместимости с системой файлов
    # Используем фиктивный UUID для product_id (можно создать системный продукт или использовать существующий)
    # Для простоты создадим запись с фиктивным product_id, но это не идеально
    # Альтернатива: хранить только путь в настройках и отдавать файл через отдельный endpoint
    # Пока используем подход с ProductImage для совместимости с /api/files/{id}
    
    # Создаём или находим системный продукт для фоновых изображений
    from app.models.product import Product
    sys_product_slug = "__system_background__"
    stmt = select(Product).where(Product.slug == sys_product_slug)
    result = await db.execute(stmt)
    sys_product = result.scalars().first()
    
    if not sys_product:
        # Создаём системный продукт
        sys_product = Product(
            slug=sys_product_slug,
            title="System Background Image",
            is_published=False,
        )
        db.add(sys_product)
        await db.flush()
    
    from app.models.product import ProductImage
    img = ProductImage(
        id=img_id,
        product_id=sys_product.id,
        file_path=rel_path,
        alt="Background image",
        sort_order=0,
        mime=file.content_type,
        size_bytes=len(content),
    )
    db.add(img)
    await db.flush()

    # Обновляем настройку в .env
    env_path = Path(".env")
    if not env_path.exists():
        current = Path(__file__).parent.parent.parent.parent
        env_path = current / ".env"
        if not env_path.exists():
            env_path = current.parent / ".env"
        if not env_path.exists():
            raise HTTPException(status_code=500, detail=".env file not found")

    env_lines = []
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            env_lines = f.readlines()

    new_lines = []
    updated = False
    for line in env_lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            new_lines.append(line)
            continue

        parts = stripped.split("=", 1)
        if len(parts) != 2:
            new_lines.append(line)
            continue

        key = parts[0].strip().upper()
        if key == "MINIAPP_BACKGROUND_IMAGE":
            new_lines.append(f'MINIAPP_BACKGROUND_IMAGE="/api/files/{img_id}"\n')
            updated = True
        else:
            new_lines.append(line)

    if not updated:
        new_lines.append(f'MINIAPP_BACKGROUND_IMAGE="/api/files/{img_id}"\n')

    try:
        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        get_settings.cache_clear()
        await db.commit()
    except Exception as e:
        await db.rollback()
        logging.getLogger(__name__).exception("Failed to update .env file")
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")

    return {"id": str(img_id), "url": f"/api/files/{img_id}"}


@router.delete("/settings/background-image")
async def admin_delete_background_image(db: AsyncSession = Depends(get_db)):
    """Удаление фонового изображения для мини-приложения."""
    s = get_settings()
    if not s.miniapp_background_image or not s.miniapp_background_image.startswith("/api/files/"):
        raise HTTPException(status_code=404, detail="Background image not found")

    try:
        file_id = UUID(s.miniapp_background_image.replace("/api/files/", ""))
        from app.models.product import ProductImage
        stmt = select(ProductImage).where(ProductImage.id == file_id)
        result = await db.execute(stmt)
        img = result.scalars().first()
        if img:
            storage = get_storage()
            await storage.delete(img.file_path)
            await db.delete(img)
            await db.flush()

        # Очищаем настройку в .env
        env_path = Path(".env")
        if not env_path.exists():
            current = Path(__file__).parent.parent.parent.parent
            env_path = current / ".env"
            if not env_path.exists():
                env_path = current.parent / ".env"
            if not env_path.exists():
                raise HTTPException(status_code=500, detail=".env file not found")

        env_lines = []
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                env_lines = f.readlines()

        new_lines = []
        for line in env_lines:
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                new_lines.append(line)
                continue

            parts = stripped.split("=", 1)
            if len(parts) != 2:
                new_lines.append(line)
                continue

            key = parts[0].strip().upper()
            if key == "MINIAPP_BACKGROUND_IMAGE":
                new_lines.append('MINIAPP_BACKGROUND_IMAGE=""\n')
            else:
                new_lines.append(line)

        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        get_settings.cache_clear()
        await db.commit()
    except Exception as e:
        await db.rollback()
        logging.getLogger(__name__).exception("Failed to delete background image")
        raise HTTPException(status_code=500, detail=f"Failed to delete background image: {str(e)}")

    return {"deleted": True}


# --- Settings ---
@router.get("/settings", response_model=SettingsResponse)
async def admin_get_settings():
    """Получить текущие настройки."""
    s = get_settings()
    return SettingsResponse(
        contact_telegram_link=s.contact_telegram_link,
        storage_max_file_size_mb=s.storage_max_file_size_mb,
        storage_allowed_image_types=s.storage_allowed_image_types,
        storage_allowed_attachment_types=s.storage_allowed_attachment_types,
        log_level=s.log_level,
        log_max_bytes_mb=s.log_max_bytes_mb,
        miniapp_section_title=s.miniapp_section_title,
        miniapp_footer_text=s.miniapp_footer_text,
        miniapp_background_color=s.miniapp_background_color,
        miniapp_background_image=s.miniapp_background_image,
        miniapp_text_color=s.miniapp_text_color,
        miniapp_heading_color=s.miniapp_heading_color,
        miniapp_price_color=s.miniapp_price_color,
        miniapp_hint_color=s.miniapp_hint_color,
        miniapp_card_bg_color=s.miniapp_card_bg_color,
        api_port=s.api_port,
        cors_origins=s.cors_origins,
        storage_path=s.storage_path,
    )


@router.put("/settings", response_model=SettingsResponse)
async def admin_update_settings(data: SettingsUpdate):
    """Обновить безопасные настройки (сохраняет в .env файл)."""
    import os
    import shlex
    from pathlib import Path

    # Ищем .env в корне проекта (относительно services/api)
    # В Docker контейнере рабочая директория обычно /app, .env должен быть в корне проекта
    env_path = Path(".env")
    # Если не найден, пробуем найти относительно корня проекта
    if not env_path.exists():
        # Пробуем найти .env в родительских директориях (для Docker)
        current = Path(__file__).parent.parent.parent.parent  # services/api/app/api -> services/api
        env_path = current / ".env"
        if not env_path.exists():
            # Пробуем корень проекта
            env_path = current.parent / ".env"
        if not env_path.exists():
            raise HTTPException(status_code=500, detail=".env file not found")

    # Читаем текущий .env
    env_lines = []
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            env_lines = f.readlines()

    # Обновляем значения
    updates = data.model_dump(exclude_unset=True)
    updated_keys = set()

    new_lines = []
    for line in env_lines:
        stripped = line.strip()
        # Сохраняем пустые строки и комментарии
        if not stripped or stripped.startswith("#"):
            new_lines.append(line)
            continue

        if "=" not in stripped:
            new_lines.append(line)
            continue

        # Парсим ключ и значение (учитываем кавычки)
        parts = stripped.split("=", 1)
        if len(parts) != 2:
            new_lines.append(line)
            continue

        key = parts[0].strip().upper()
        original_value = parts[1].strip()

        # Обновляем значение, если оно есть в updates
        if key.lower() in updates:
            value = updates[key.lower()]
            # Форматируем значение
            if isinstance(value, str):
                # Если значение содержит пробелы или специальные символы, используем кавычки
                if " " in value or "=" in value or "#" in value:
                    # Экранируем кавычки внутри строки
                    escaped_value = value.replace('\\', '\\\\').replace('"', '\\"')
                    new_lines.append(f'{key}="{escaped_value}"\n')
                else:
                    new_lines.append(f"{key}={value}\n")
            else:
                new_lines.append(f"{key}={value}\n")
            updated_keys.add(key.lower())
        else:
            # Сохраняем оригинальную строку
            new_lines.append(line)

    # Добавляем новые ключи, которых не было в .env
    for key, value in updates.items():
        if key not in updated_keys:
            key_upper = key.upper()
            if isinstance(value, str):
                if " " in value or "=" in value or "#" in value:
                    escaped_value = value.replace('\\', '\\\\').replace('"', '\\"')
                    new_lines.append(f'{key_upper}="{escaped_value}"\n')
                else:
                    new_lines.append(f"{key_upper}={value}\n")
            else:
                new_lines.append(f"{key_upper}={value}\n")

    # Сохраняем обновлённый .env
    try:
        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

        # Перезагружаем настройки (сбрасываем кэш)
        get_settings.cache_clear()
        s = get_settings()

        return SettingsResponse(
            contact_telegram_link=s.contact_telegram_link,
            storage_max_file_size_mb=s.storage_max_file_size_mb,
            storage_allowed_image_types=s.storage_allowed_image_types,
            storage_allowed_attachment_types=s.storage_allowed_attachment_types,
            log_level=s.log_level,
            log_max_bytes_mb=s.log_max_bytes_mb,
            miniapp_section_title=s.miniapp_section_title,
            miniapp_footer_text=s.miniapp_footer_text,
            miniapp_background_color=s.miniapp_background_color,
            miniapp_background_image=s.miniapp_background_image,
            miniapp_text_color=s.miniapp_text_color,
            miniapp_heading_color=s.miniapp_heading_color,
            miniapp_price_color=s.miniapp_price_color,
            miniapp_hint_color=s.miniapp_hint_color,
            miniapp_card_bg_color=s.miniapp_card_bg_color,
            api_port=s.api_port,
            cors_origins=s.cors_origins,
            storage_path=s.storage_path,
        )
    except Exception as e:
        logging.getLogger(__name__).exception("Failed to update .env file")
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")
