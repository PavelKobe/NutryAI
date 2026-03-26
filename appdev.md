# NutriAI — локальная разработка и паттерны

Кратко: **продакшен-фронт** — Next.js в `app/web`; исторический Vite SPA лежит в **`archive/frontend-vite/`**. Один **FastAPI-бэкенд** в `app/backend`. Дизайн и целевая архитектура: `docs/design/system_design.md`, `docs/design/file_tree.md`.

---

## Требования к окружению

| Компонент | Минимум |
|-----------|---------|
| Node.js | 18+ (для Next 15 — актуальный LTS) |
| Менеджер пакетов | `npm` или `pnpm` (для `app/web`) |
| Python | 3.11+ |
| БД | PostgreSQL **или** SQLite в зависимости от `DATABASE_URL` в `.env` |

Опционально: **uv** — используется в `app/start_app_v2.sh` для venv и pip.

---

## Переменные окружения

1. Скопируйте `app/.env.example` → `app/.env` (файл рядом с каталогом `backend/`, как в комментарии в примере).
2. Обязательно задайте как минимум:
   - `DATABASE_URL` — строка подключения (async: `postgresql+asyncpg://...` или то, что ожидает ваш `services/database`).
   - `JWT_SECRET_KEY` — см. комментарий в `.env.example`.
   - `APP_AI_KEY` / `APP_AI_BASE_URL` — для модуля aihub (OpenRouter и т.п.).
3. Для **Next.js** (`app/web`): скопируйте `app/web/.env.example` → `app/web/.env.local` и выставьте:
   - `NEXT_PUBLIC_API_BASE_URL` — URL FastAPI (локально часто `http://127.0.0.1:8000`).
   - `INTERNAL_API_BASE_URL` — тот же бэкенд для прокси стриминга ИИ (`/api/v1/aihub/*`).

Скрипт `app/start_app_v2.sh` умеет подставлять плейсхолдеры `$$BACKEND_DOMAIN$$` / `$$FRONTEND_DOMAIN$$` из `.env` — это путь для Linux/macOS и CI; на Windows удобнее руками прописать URL в `.env` / `.env.local`.

---

## Вариант 1: FastAPI + Next.js (`app/web`) — основной стек

### Backend

```powershell
cd app\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r requirements.default
$env:IS_LAMBDA = "false"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- Документация API: `http://127.0.0.1:8000/docs`
- Health: `GET /health` (используется в `start_app_v2.sh`)

Переменные из `app/.env` подхватываются через окружение процесса (и `python-dotenv`, если настроено в проекте).

Локально можно держать настройки в **`app/backend/.env_development`**: при старте `main.py` подгружает его, если **`ENVIRONMENT` не `prod`**. На проде в окружении должен быть **`ENVIRONMENT=prod`**, тогда этот файл не читается.

### Backend: команды (Windows PowerShell)

**Запуск API** (из каталога `app\backend`):

На Windows надёжнее вызывать **интерпретатор из `.venv` по полному пути** — иначе `python` / `pip` могут указывать на другой Python (Store, глобальный), и пакеты ставятся «не туда», а в консоли остаётся префикс `(.venv)`.

```powershell
cd app\backend
# первый раз, если нет .venv: py -3.11 -m venv .venv   (или python -m venv .venv с нужным Python)
.\.venv\Scripts\python.exe -m pip install -U pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pip install -r requirements.default
$env:IS_LAMBDA = "false"
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Или из `app\backend`: **`.\run_dev.ps1`** — то же самое, без риска подхватить глобальный `uvicorn`.

Проверка, что модули в этом же Python: `.\.venv\Scripts\python.exe -c "import pydantic_settings; print('ok')"`.

Если `python` без пути даёт другой исполняемый файл: `Get-Command python` — отключите в Windows **Параметры → Приложения → Доп. параметры приложения → Псевдонимы выполнения приложений** для `python.exe` / `python3.exe`.

**Миграции Alembic** ([`app/backend/alembic`](app/backend/alembic)): `alembic/env.py` грузит `app/.env`, затем при **`ENVIRONMENT` ≠ `prod`** — `app/backend/.env_development` (как при старте API). Для Alembic URL должен быть с **`postgresql+asyncpg://`** (или `postgresql://` — при необходимости поправьте вручную в переменной).

**Ошибка `password authentication failed for user "NutryAi_user"`** — в PostgreSQL нет такого пользователя с паролем из `DATABASE_URL`, или пароль другой. Под суперпользователем `postgres` (psql / pgAdmin):

```sql
CREATE USER "NutryAi_user" WITH PASSWORD '1234';
CREATE DATABASE "NutryAi_db" OWNER "NutryAi_user";
GRANT ALL PRIVILEGES ON DATABASE "NutryAi_db" TO "NutryAi_user";
```

Без кавычек PostgreSQL приводит имена к **нижнему регистру** (`nutryai_user`, `nutryai_db`) — тогда в `DATABASE_URL` укажите их в нижнем регистре.

Если пользователь уже есть: `ALTER USER "NutryAi_user" WITH PASSWORD '1234';` — либо смените пароль в `.env_development` на реальный.

```powershell
cd app\backend
.\.venv\Scripts\Activate.ps1
# Вариант A: строка в app\.env → DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/dbname
# Вариант B: один раз в сессии:
$env:DATABASE_URL = "postgresql+asyncpg://NutryAi_user:1234@localhost:5432/NutryAi_db"

alembic current
alembic history
alembic upgrade head
# новая ревизия по моделям (после правок в models/):
# alembic revision --autogenerate -m "описание_изменений"
# alembic upgrade head
```

На Linux/macOS те же команды, активация venv: `source .venv/bin/activate`.

### Web (Next.js)

```powershell
cd app\web
copy .env.example .env.local
# отредактируйте .env.local
npm install
# или: pnpm install
npm run dev
```

- Dev-сервер: `http://localhost:3000`.
- Роут `app/web/src/app/api/v1/aihub/[...path]/route.ts` проксирует стриминг ИИ на `INTERNAL_API_BASE_URL` — без запущенного FastAPI чат/ИИ с бэкендом не заработают.

### Сборка

```powershell
cd app\web
npm run build
npm run start
```

### Автозапуск (Linux/macOS)

```bash
cd app
chmod +x start_app_v2.sh
./start_app_v2.sh              # старт backend + Next (app/web) с подбором портов
./start_app_v2.sh --no-start   # только зависимости
```

На Windows этот bash-скрипт нужен WSL/Git Bash или ручные команды выше.

---

## Архив: Vite SPA

Исторический фронт на Vite — каталог **`archive/frontend-vite/`** (см. README там). Не используется для продакшена.

---

## Ключевые паттерны разработки

### Backend (FastAPI)

- **Точка входа**: `app/backend/main.py` — lifespan, CORS, динамическая регистрация роутеров.
- **Слои**: `routers/` (HTTP), `services/` (логика, БД, интеграции), `schemas/` (Pydantic), `models/` (ORM/SQLAlchemy по модулям).
- **Конфиг**: `core/config.py` — `BaseSettings` + динамические атрибуты из `UPPER_SNAKE` переменных окружения.
- **Шаблонные маркеры** в `main.py` (`MODULE_IMPORTS_*`, `MODULE_STARTUP_*`) — типичный паттерн генерации/модульных вставок; новые модули подключают в том же стиле.

### Архив Vite (`archive/frontend-vite/`)

- Сохранён только для истории; не развивать. Актуальный стек — Next.js ниже.

### Next.js (`app/web`)

- **App Router**: страницы в `src/app/**/page.tsx`, общий layout в `src/app/layout.tsx`.
- **Конфиг API**: `src/lib/config.ts` — при необходимости подгружает JSON с `/api/config`, иначе `NEXT_PUBLIC_API_BASE_URL` или fallback `http://127.0.0.1:8000`.
- **SDK и SSR**: `src/lib/api.ts` — ленивая инициализация клиента только в браузере; при смене токена в `localStorage` клиент пересоздаётся (избегание 401 на устаревшем Bearer).
- **Прокси ИИ**: обязателен catch-all под `/api/v1/aihub/*` на стороне Next → FastAPI.

### Общее

- Стиль UI: **Radix + Tailwind + shadcn-паттерн** в `app/web`.
- Документация продукта и дерево целевой структуры: `docs/design/prd.md`, `docs/design/file_tree.md` (там же отличие Demo vs Production).

---

## Полезные команды

| Задача | Команда |
|--------|---------|
| Линт Next | `cd app/web && npm run lint` |
| Тесты бэкенда | `cd app/backend && pytest` (зависимости из `requirements.txt`) |

---

## Частые проблемы

1. **Порт 3000 занят** — смените порт в `next dev` (`npm run dev` / аргумент `-p`).
2. **CORS** — проверьте origin фронта в настройках CORS в `main.py` и `CORS_EXTRA_ORIGINS` в `.env`.
3. **ИИ 404 в Next** — должен быть запущен FastAPI и корректный `INTERNAL_API_BASE_URL`.
4. **401 после логина в Next** — см. комментарий в `app/web/src/lib/api.ts` про пересоздание клиента SDK при смене токена.
