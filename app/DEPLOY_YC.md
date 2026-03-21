# Деплой Nutriaidiary на Yandex Cloud

Краткая инструкция по плану: VM `api.nutriaidiary.com`, фронт `nutriaidiary.com`, Next.js в `app/web`, API в `app/backend`.

## 1. Ротация секретов (обязательно, если ключи светились)

- OpenRouter: новый ключ, старый отозвать.
- Значения только в `.env`, Lockbox или переменных VM — не в git.

## 2. Managed PostgreSQL

1. Создать кластер в Yandex Managed Service for PostgreSQL.
2. Пользователь, БД, включить SSL при необходимости.
3. Строка в `DATABASE_URL` (см. `app/.env.example`): формат `postgresql+asyncpg://...` или `postgresql://...` (бэкенд нормализует драйвер).

## 3. Сеть и VM

**Пошагово для новичка после пуша на GitHub:** [`VM_NEWBIE.md`](VM_NEWBIE.md) (Security Group YC, UFW, Nginx, клон, `.env`, сборка, Certbot). Скрипты: `scripts/vm_clone_from_github.sh`, `scripts/vm_install_app.sh`.

Скрипт первичной настройки Ubuntu-VM (Nginx, UFW, Node, Python, опционально PostgreSQL и Docker): [`scripts/vm_bootstrap_yandex.sh`](scripts/vm_bootstrap_yandex.sh). Запуск от root: задайте `NEW_USER_PASSWORD`, при необходимости `INSTALL_LOCAL_POSTGRES=0` (только Managed PG) или `INSTALL_DOCKER=1`.

1. VPC, security group: вход **443** (и **80** при необходимости) на reverse-proxy; **8000/3000** только с localhost, если прокси на той же VM.
2. Исходящий HTTPS: `openrouter.ai`, хосты Yandex для БД.
3. VM: установить Docker / Docker Compose, склонировать репозиторий, положить `.env` в `NutryAI/app/`.

## 4. Переменные окружения (бэкенд)

Файл `NutryAI/app/.env` по образцу `.env.example`:

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | PostgreSQL async |
| `JWT_SECRET_KEY` | Подпись JWT сессии приложения |
| `FRONTEND_URL` | `https://nutriaidiary.com` (канонический фронт) |
| `PYTHON_BACKEND_URL` | `https://api.nutriaidiary.com` |
| `APP_AI_BASE_URL` | `https://openrouter.ai/api/v1` |
| `APP_AI_KEY` | Ключ OpenRouter |

Аутентификация: регистрация и вход по **email + пароль** (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`), JWT в `Authorization: Bearer` (фронт хранит в `localStorage` под ключом `token`).

Дополнительные CORS-origin через запятую: `CORS_EXTRA_ORIGINS=https://staging.example.com`

## 5. Фронт (Next)

В корне `app/` для compose или в `web/.env.local` для локальной сборки:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.nutriaidiary.com
NEXT_PUBLIC_SITE_URL=https://nutriaidiary.com
```

Эндпоинт `GET /api/config` на Next отдаёт `API_BASE_URL` для клиента (см. `web/src/app/api/config/route.ts`).

## 6. Сборка и запуск Docker

Из каталога `NutryAI/app`:

```bash
docker compose build
docker compose up -d
```

За reverse-proxy (nginx / Caddy):

- `nutriaidiary.com` → `127.0.0.1:3000` (Next)
- `api.nutriaidiary.com` → `127.0.0.1:8000` (FastAPI)

TLS: Let’s Encrypt или сертификат Yandex Certificate Manager.

## 7. Миграции Alembic

После первого поднятия БД (из контейнера API или venv на хосте):

```bash
cd NutryAI/app/backend
alembic upgrade head
```

Убедиться, что `DATABASE_URL` доступен в том же окружении.

## 8. Проверка

- `GET https://api.nutriaidiary.com/health`
- Регистрация / вход по email
- Запросы к ИИ с авторизованным пользователем
- Главная: view-source, видны meta/OG; `/sitemap.xml`, `/robots.txt`

## 9. Container Registry (опционально)

Собрать образы локально, `docker tag`, `docker push` в `cr.yandex/...`, на VM — `docker pull` и `docker compose` с образами вместо `build`.
