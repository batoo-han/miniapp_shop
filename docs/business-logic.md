# Бизнес-логика

## Сущности

### Product (товар)

- `id`, `slug` (уникальный), `title`, `short_description`, `description`
- `price_amount`, `price_currency` — опционально
- `is_published` — видимость в витрине
- `sort_order` — порядок вывода
- `created_at`, `updated_at`

### ProductImage (изображение товара)

- Несколько фото на товар
- `sort_order` для порядка в галерее
- Поддержка alt, mime, size_bytes, width/height

### ProductAttachment (прикреплённый файл)

- PDF, инструкции, спецификации
- `title`, mime, size_bytes, `sort_order`

### ProductSpec (ТТХ)

- Пара «название — значение», опционально единица измерения
- `sort_order` для порядка вывода

## Правила

1. **Публикация**: в витрине показываются только товары с `is_published = true`.
2. **Slug**: уникален, формируется из `title` или задаётся вручную.
3. **Цена**: если нет — в карточке не отображается.
4. **Контакт**: кнопка «Связаться» ведёт на `t.me/...` или бота (из конфигурации).
