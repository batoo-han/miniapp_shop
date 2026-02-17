# Telegram Mini App — витрина товаров

SPA-витрина продукции в Telegram Mini App с отдельной веб-админкой для управления контентом.

## Структура проекта

```
miniapp_shop/
├── apps/
│   ├── miniapp-web/     # Telegram Mini App (витрина)
│   └── admin-web/       # Веб-админка
├── services/
│   └── api/             # FastAPI backend
├── infra/               # Docker, nginx
├── docs/                # Документация
└── storage/             # Загруженные файлы (не в git)
```

## Настройка .env (важно)

В проекте **два набора** переменных окружения:

| Место | Для чего | Обязательно |
|-------|----------|-------------|
| `services/api/.env` | Backend API (БД, JWT, CORS, хранилище) | Да, для локальной разработки |
| `.env` (в корне) | Только для Docker Compose при запуске из корня | Нет, для локальной разработки |

### 1. Backend API — `services/api/.env`

```bash
cd services/api
cp .env.example .env
# Отредактируйте .env: DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD и т.д.
```

Обязательно укажите:
- `API_PORT=8024` — порт API (если не 8000). Фронтенды должны иметь тот же порт в `VITE_API_PORT`
- `DATABASE_URL` — строка подключения к Postgres (для async: `postgresql+asyncpg://user:pass@host:5432/dbname`)
- `ADMIN_PASSWORD=admin` — для входа в админку в разработке
- `CORS_ORIGINS=http://localhost:5173,http://localhost:5174` — URL фронтендов

### 2. Корневой `.env` — только для Docker

Используется, когда запускаете `docker compose -f infra/docker-compose.yml up` **из корня проекта**. Docker Compose подхватывает переменные из `.env` в текущей директории.

Для локальной разработки **без Docker** корневой `.env` не нужен.

### 3. Фронтенды (Mini App, Админка)

Оба приложения ищут `.env` в своей папке. Если не создать — используются значения по умолчанию (`http://localhost:8000/api`). Для обычной разработки этого достаточно.

При необходимости создайте:
- `apps/miniapp-web/.env` — `VITE_API_URL`, `VITE_CONTACT_TELEGRAM_LINK`
- `apps/admin-web/.env` — `VITE_API_URL`

## Быстрый старт

### Требования
- Python 3.12+
- Node.js 20+
- Docker, Docker Compose (для полного деплоя)

### Разработка

```bash
# 1. Настроить API
cd services/api
python -m venv .venv
.venv\Scripts\activate   # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # заполнить API_PORT, DATABASE_URL, ADMIN_PASSWORD, CORS_ORIGINS
alembic upgrade head
python run.py            # порт берётся из API_PORT в .env

# 2. В другом терминале — Mini App (витрина)
cd apps/miniapp-web
npm install
npm run dev

# 3. В третьем терминале — Админка
cd apps/admin-web
cp .env.example .env     # при API на другом порту: VITE_API_PORT=8024
npm install
npm run dev
```

- Витрина: http://localhost:5173  
- Админка: http://localhost:5174  
- API: http://localhost:${API_PORT} (из services/api/.env, по умолчанию 8000)  
- Вход в админку: логин `admin`, пароль из `ADMIN_PASSWORD` (по умолчанию `admin`)

**Если API на другом порту**: укажите `API_PORT=8024` в `services/api/.env` — фронтенды автоматически подхватят порт оттуда. Либо задайте `VITE_API_PORT=8024` в `.env` каждого фронтенда.

### Docker

```bash
docker compose -f infra/docker-compose.yml up -d
```

## Если не работает

1. **ERR_EMPTY_RESPONSE / socket hang up / 500 на логин**:  
   - API должен быть запущен: `cd services/api && python run.py`  
   - Порт прокси берётся из `API_PORT` в `services/api/.env` автоматически. Проверьте, что в консоли при `npm run dev` отображается правильный порт: `API proxy → http://localhost:8024`.

2. **Admin: "Cannot find module dep-..." (Vite)** — повреждённые node_modules:
   ```powershell
   cd apps/admin-web
   Remove-Item -Recurse -Force node_modules
   Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
   npm install
   npm run dev
   ```

3. **CORS / сеть**: в `services/api/.env` должно быть  
   `CORS_ORIGINS=http://localhost:5173,http://localhost:5174`
4. **Админка не входит**: проверьте `ADMIN_PASSWORD=admin` (или `ADMIN_PASSWORD_HASH`) в `services/api/.env`
5. **Пустой список товаров**: добавьте товары в админке (http://localhost:5174) и включите «Опубликован»
6. **Ошибка подключения к БД**: проверьте `DATABASE_URL` и что Postgres запущен

## Документация

- [Архитектура](docs/architecture.md)
- [Бизнес-логика](docs/business-logic.md)
- [План реализации](docs/implementation-plan.md)
- [Руководство пользователя](docs/user-guide.md)
- [API](docs/api.md)

## Предпродакшн

См. [docs/preproduction-checklist.md](docs/preproduction-checklist.md)

```bash
# Аудит зависимостей
pip install pip-audit && cd services/api && pip-audit
cd apps/miniapp-web && npm audit
cd apps/admin-web && npm audit
```

## Лицензия

Proprietary.
