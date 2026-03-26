# NutriAI Diary

Монорепозиторий: **FastAPI** (бэкенд) + **Next.js 15** (веб и продакшен-UI). Каталог **`archive/`** в git не входит (см. `.gitignore`); при необходимости старый Vite-SPA держите только локально или в отдельном бэкапе.

## Структура

| Путь | Описание |
|------|----------|
| [`app/backend/`](app/backend/) | FastAPI, PostgreSQL, Alembic |
| [`app/web/`](app/web/) | Next.js (App Router), лендинг, личный кабинет, админка |
| [`app/docker/`](app/docker/) | `Dockerfile.backend`, `Dockerfile.web` |
| [`app/scripts/`](app/scripts/) | Скрипты деплоя / VM |
| `archive/` (локально, не в GitHub) | По желанию: архив legacy Vite-SPA, не для продакшена |

## Локальная разработка

Краткая инструкция: **[ИНСТРУКЦИЯ_ЗАПУСКА_DEV.md](ИНСТРУКЦИЯ_ЗАПУСКА_DEV.md)**  
Паттерны и окружение: **[appdev.md](appdev.md)**

1. PostgreSQL, переменные из **[`app/.env.example`](app/.env.example)** и при необходимости **`app/web/.env.example`**.  
2. `cd app/backend && alembic upgrade head`  
3. Запуск API и `npm run dev` в `app/web`.

## Продакшен

### Переменные

- **Backend:** `ENVIRONMENT=prod`, `DATABASE_URL`, `JWT_SECRET_KEY`, `FRONTEND_URL`, `PYTHON_BACKEND_URL`, ключи ИИ и др. — см. [`app/.env.example`](app/.env.example).  
- **Web (build/runtime):** `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL` — см. [`app/web/.env.example`](app/web/.env.example).  
- При необходимости: `CORS_EXTRA_ORIGINS` (доп. origin’ы к списку в `main.py`).

### Миграции

Перед выкладкой новой версии API: **`alembic upgrade head`** на целевой БД.

### Docker

Контекст сборки — каталог **`app/`** (чтобы пути `backend/` и `web/` совпадали с Dockerfile):

```bash
cd app
docker build -f docker/Dockerfile.backend -t nutriai-backend .
docker build -f docker/Dockerfile.web -t nutriai-web \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://example.com .
```

Файл **[`app/.dockerignore`](app/.dockerignore)** исключает `.venv`, `node_modules`, `.next` и `.env` из контекста.

## Безопасность и Git

- Не коммитить `.env`, `.env.local`, реальные ключи и каталоги **`.venv`**.  
- Перед первым push в публичный репозиторий проверить историю на утечки секретов.

## CI

При push/PR запускается GitHub Actions: сборка `app/web` и проверка импорта/синтаксиса `app/backend` (см. `.github/workflows/`).
