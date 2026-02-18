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

## 3. Docker (одна команда)

В новой схеме фронтенды собираются **внутри Docker** (см. `infra/Dockerfile.web`), руками `dist` копировать не нужно.

## 4. Файл .env в корне проекта

Создайте `/root/miniapp_shop/.env`:

```bash
# API запускается в режиме host network (см. docker-compose.yml),
# поэтому PostgreSQL на хосте доступна как localhost.
DATABASE_URL=postgresql+asyncpg://showcase_user:ВАШ_ПАРОЛЬ@localhost:5432/showcase
JWT_SECRET=случайная-длинная-строка-секрет
ADMIN_PASSWORD=пароль-для-админки

# Если порт 80 занят — web будет на 8080/8089 и т.д.
WEB_PORT=8080
```

## 5. Запуск контейнеров

```bash
cd /root/miniapp_shop
cp .env.example .env  # один раз, дальше только правите .env
docker compose up -d --build
```

**Если всё равно не работает:**
1. Проверьте, что PostgreSQL принимает соединения из Docker-сети:
   ```bash
   # Проверьте postgresql.conf: listen_addresses = '*' или '0.0.0.0'
   sudo grep listen_addresses /etc/postgresql/*/main/postgresql.conf
   
   # Проверьте pg_hba.conf — должна быть строка для Docker-сети:
   # host    all    all    172.17.0.0/16    md5
   sudo grep -A 5 "Docker\|172.17" /etc/postgresql/*/main/pg_hba.conf
   ```
2. Если PostgreSQL слушает только на localhost, временно разрешите подключения:
   ```bash
   # В postgresql.conf: listen_addresses = '*'
   # В pg_hba.conf добавьте: host all all 172.17.0.0/16 md5
   sudo systemctl reload postgresql
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

## 8. HTTPS (внешний прокси с SSL)

Если миниапп открывается по HTTPS (например, через внешний nginx/traefik), **внешний прокси должен передавать** `X-Forwarded-Proto: https` во внутренний контейнер `web`. Иначе API будет формировать redirect (307) с `Location: http://...`, что вызовет Mixed Content.

Пример для внешнего nginx:
```nginx
location /miniapp/ {
    proxy_pass http://127.0.0.1:8080;  # порт web-контейнера
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;   # важно для HTTPS
}
```
