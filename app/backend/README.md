# NutriAI Diary — backend (FastAPI)

API для приложения «Умный дневник питания»: JWT-аутентификация, сущности (профиль, дневник, планы, рецепты), прокси ИИ (OpenRouter / aihub), админка.

## Стек

- Python 3.11+, FastAPI, Uvicorn  
- PostgreSQL + SQLAlchemy 2 (async), Alembic  
- Pydantic v2, `python-dotenv`

## Быстрый старт (локально)

1. Создать venv в этом каталоге: `python -m venv .venv`  
2. Установить зависимости: `pip install -r requirements.txt` (+ при необходимости `requirements.default`)  
3. Переменные окружения: см. **[`../.env.example`](../.env.example)**. Для разработки удобен **`./.env_development`** (не коммитить), подхватывается, если `ENVIRONMENT` ≠ `prod`.  
4. Миграции: `alembic upgrade head`  
5. Запуск: **`./run_dev.ps1`** (Windows) или `uvicorn main:app --reload --host 0.0.0.0 --port 8000` из активированного venv.

Подробнее: [ИНСТРУКЦИЯ_ЗАПУСКА_DEV.md](../../ИНСТРУКЦИЯ_ЗАПУСКА_DEV.md), [appdev.md](../../appdev.md).

## Структура (кратко)

| Каталог | Назначение |
|---------|------------|
| `main.py` | Точка входа, CORS, lifespan, подключение роутеров |
| `routers/` | HTTP-маршруты |
| `services/` | Бизнес-логика, БД |
| `models/` | SQLAlchemy-модели |
| `schemas/` | Pydantic-схемы |
| `alembic/` | Миграции БД |
| `dependencies/` | FastAPI Depends (например `get_current_user`) |
| `core/` | Конфиг, БД-сессии |

## Доп. документация для разработки

В каталоге **`skills_docs/`** — заметки по web-sdk, aihub, кастомным API и хранилищу (ориентиры для ИИ/разработчиков).

## Docker

Сборка из контекста **`app/`** (родитель этого каталога):

```bash
docker build -f docker/Dockerfile.backend -t nutriai-backend .
```

В репозитории есть **[`../.dockerignore`](../.dockerignore)** — не копирует `.venv` и секреты в контекст.
