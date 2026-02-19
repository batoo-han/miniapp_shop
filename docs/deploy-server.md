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

## 4. Telegram-бот (опционально)

Чтобы пользователи могли запускать витрину из Telegram, добавьте бота. Получите токен у [@BotFather](https://t.me/BotFather), в `.env` укажите:

```
BOT_TOKEN=123456:ABC-DEF...
MINIAPP_URL=https://app.batoohan.ru/miniapp/
```

Подробнее: [docs/telegram-bot.md](telegram-bot.md).

## 5. Файл .env в корне проекта

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

## 6. Запуск контейнеров

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

## 7. Удаление старых контейнеров (опционально)

Если раньше запускали полный compose с db:
```bash
docker compose -f infra/docker-compose.external-db.yml down --remove-orphans
```

## 8. Если порт 80 уже занят

В `.env` добавьте:
```
NGINX_PORT=8080
```

Сервис будет доступен на `http://сервер:8080`.

## 9. HTTPS и Mixed Content (важно)

При работе по HTTPS возможна ошибка Mixed Content: страница загружается по HTTPS, а запросы к API — по HTTP. Ниже — проверенные меры.

## 10. Mini App «пустой» при запуске из кнопки Telegram (важно)

Симптом:
- по **прямой ссылке** `https://app.example.ru/miniapp/` витрина открывается,
- но при запуске из **кнопки «Каталог»** (reply keyboard `web_app` или кнопка меню `MenuButtonWebApp`) экран пустой.

На практике это часто связано с тем, что в некоторых клиентах (особенно **Telegram Web**) Mini App открывается **внутри iframe**. Если ваш внешний nginx/прокси добавляет заголовки, запрещающие встраивание, Telegram покажет «пустую» страницу.

Проверьте и исправьте:

- **X-Frame-Options**: не должно быть `DENY` или `SAMEORIGIN` для `/miniapp/`.
- **Content-Security-Policy**: не должно быть `frame-ancestors 'none'`. Нужно разрешить домены Telegram.

Пример (внешний nginx) — разрешить встраивание для Telegram:

```nginx
location /miniapp/ {
    proxy_pass http://127.0.0.1:8090;  # порт web-контейнера
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Разрешаем iframe в Telegram Web
    add_header Content-Security-Policy "frame-ancestors 'self' https://web.telegram.org https://web.telegram.k.org https://web.telegram.me https://t.me https://*.telegram.org;" always;
    # Убедитесь, что НЕ добавляете X-Frame-Options: DENY/SAMEORIGIN
}
```

Также проверьте настройки в **BotFather**:
- в настройках Web App/Domain должен быть разрешён домен `app.example.ru` (иначе Web App может не открываться корректно из кнопки).

### 9.1 Внешний прокси

Внешний nginx/traefik должен передавать `X-Forwarded-Proto: https` внутрь контейнера `web`, чтобы redirect (307) формировался с `https://`, а не `http://`.

Пример для внешнего nginx:
```nginx
location /miniapp/ {
    proxy_pass http://127.0.0.1:8090;  # порт web-контейнера
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;   # важно для HTTPS
}
```

### 9.2 Trailing slash (избежание 307 redirect)

API ожидает `/api/products/` (с завершающим слэшем). Фронтенд вызывает `/api/products/?...`, чтобы сразу попадать на нужный маршрут без redirect. Это уже учтено в коде `apps/miniapp-web/src/api.ts`.

### 9.3 Uvicorn и nginx

- API запускается с флагом `--proxy-headers` (см. `infra/Dockerfile.api`), чтобы учитывать `X-Forwarded-Proto`.
- Внутренний nginx передаёт `X-Forwarded-Proto` от внешнего прокси в backend (см. `infra/nginx.conf`, `$forwarded_proto`).

### 9.4 Загрузка файлов (413 Request Entity Too Large)

Для загрузки фонового изображения и файлов товаров приложение допускает файлы до 50 МБ. Во внутреннем nginx (`infra/nginx.conf`) задано `client_max_body_size 51m`. Если запросы идут через **внешний** nginx, в нём тоже нужно разрешить размер тела, например в `server` или `location /`:

```nginx
client_max_body_size 51m;
```
