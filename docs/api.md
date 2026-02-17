# API

## Базовый URL

- Локально: `http://localhost:8000`
- За прокси: `https://your-domain.com/api`

## Публичные эндпоинты (витрина)

### Список товаров

```
GET /api/products?page=1&per_page=20&sort=sort_order
```

Ответ:

```json
{
  "items": [
    {
      "id": "uuid",
      "slug": "product-slug",
      "title": "Название",
      "short_description": "Краткое описание",
      "price_amount": 1000.00,
      "price_currency": "RUB",
      "images": [{"id": "uuid", "url": "/api/files/{id}"}]
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 20
}
```

### Карточка товара

```
GET /api/products/{slug}
```

### Трекинг просмотров

```
POST /api/products/{slug}/view
```

Инкрементирует счётчик просмотров товара. Вызывается при открытии карточки в витрине (без авторизации). Рекомендуется вызывать один раз за сессию на slug.

Ответ:

```json
{
  "id": "uuid",
  "slug": "product-slug",
  "title": "Название",
  "description": "Полное описание",
  "price_amount": 1000.00,
  "price_currency": "RUB",
  "images": [...],
  "attachments": [{"id": "uuid", "title": "Инструкция.pdf", "url": "/api/files/{id}"}],
  "specs": [{"name": "Мощность", "value": "100", "unit": "Вт"}]
}
```

### Выдача файла

```
GET /api/files/{file_id}
```

Заголовки ответа: `Content-Type`, `Content-Disposition` для скачивания.

## Админские эндпоинты

Требуют заголовок: `Authorization: Bearer <jwt>`.

### Товары
- `GET /api/admin/products` — список товаров с фильтрами и пагинацией  
  Параметры: `search`, `category_id`, `is_published`, `manufacturer`, `page`, `per_page`
- `POST /api/admin/products` — создание (поддерживает sku, manufacturer, category_id)
- `GET /api/admin/products/{id}` — получение для редактирования (включает variants)
- `PUT /api/admin/products/{id}` — обновление
- `DELETE /api/admin/products/{id}` — удаление
- `POST /api/admin/products/{id}/images` — загрузка фото
- `PUT /api/admin/products/{id}/images/{image_id}` — обновление sort_order фото
- `POST /api/admin/products/{id}/attachments` — загрузка файлов
- `DELETE /api/admin/files/{id}` — удаление файла

### Варианты товара
- `POST /api/admin/products/{id}/variants` — добавление варианта (option_name, option_value, stock_qty, in_order_qty)
- `PUT /api/admin/products/{id}/variants/{vid}` — обновление варианта
- `DELETE /api/admin/products/{id}/variants/{vid}` — удаление варианта

### ТТХ
- `POST /api/admin/products/{id}/specs` — добавление ТТХ
- `PUT /api/admin/products/{id}/specs/{spec_id}` — обновление ТТХ
- `DELETE /api/admin/products/{id}/specs/{spec_id}` — удаление ТТХ

### Категории
- `GET /api/admin/categories` — список категорий
- `POST /api/admin/categories` — создание
- `PUT /api/admin/categories/{id}` — обновление
- `DELETE /api/admin/categories/{id}` — удаление

### Справочники и статистика
- `GET /api/admin/manufacturers` — список уникальных производителей (для фильтра)
- `GET /api/admin/stats` — статистика: total_products, published_count, total_views

### Авторизация
- `POST /api/admin/login` — логин, возвращает JWT
