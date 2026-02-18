# Деплой на сервер (внешняя PostgreSQL)

Пошаговая инструкция для сервера, где PostgreSQL уже запущен и порты 80/5432 могут быть заняты.

## 1. Подготовка БД

БД `showcase` и пользователь уже созданы. Подключение:
```bash
psql -U showcase_user -h localhost -d showcase
```

## 2. Миграции

**Важно:** Используйте виртуальное окружение проекта, а не системный `alembic` (системный ставит старую SQLAlchemy без async).

```bash
cd /root/miniapp_shop/services/api

# Создать venv и установить зависимости
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Запустить миграции (используйте localhost — миграции идут с хоста)
export DATABASE_URL="postgresql+asyncpg://showcase_user:ВАШ_ПАРОЛЬ@localhost:5432/showcase"
alembic upgrade head

deactivate
```

## 3. Сборка фронтендов

```bash
cd /root/miniapp_shop
cd apps/miniapp-web && npm install && npm run build && cd ../..
cd apps/admin-web && npm install && npm run build && cd ../..
```

## 4. Файл .env в корне проекта

Создайте `/root/miniapp_shop/.env`:

```bash
# Для доступа из контейнера к PostgreSQL на хосте — 172.17.0.1 (Docker gateway)
DATABASE_URL=postgresql+asyncpg://showcase_user:ВАШ_ПАРОЛЬ@172.17.0.1:5432/showcase
JWT_SECRET=случайная-длинная-строка-секрет
ADMIN_PASSWORD=пароль-для-админки

# Если порт 80 занят — nginx будет на 8080
NGINX_PORT=8080
```

## 5. Запуск контейнеров

```bash
cd /root/miniapp_shop
docker compose -f infra/docker-compose.external-db.yml up -d
```

- API: `http://сервер:8000`
- Мини-апп: `http://сервер:8080/miniapp/` (если NGINX_PORT=8080)
- Админка: `http://сервер:8080/admin/`

Если порт 80 свободен, можно не указывать NGINX_PORT — nginx будет на 80.

## 6. Удаление старых контейнеров (опционально)

Если раньше запускали полный compose с db:
```bash
docker compose -f infra/docker-compose.external-db.yml down --remove-orphans
```

## 7. Если порт 80 уже занят

В `.env` добавьте:
```
NGINX_PORT=8080
```

Сервис будет доступен на `http://сервер:8080`.
