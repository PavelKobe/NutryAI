# Инструкция: локальный запуск dev (Windows, PowerShell)

Нужны **два терминала**: бэкенд и фронт. PostgreSQL должен быть запущен; миграции один раз: из каталога `app\backend` выполнить `.\.venv\Scripts\python.exe -m alembic upgrade head`.

Команды ниже — из **корня репозитория** `NutriAi` (или сначала `cd` в него).

---

## Бэкенд (FastAPI)

```powershell
cd app\backend
$env:IS_LAMBDA = "false"
.\run_dev.ps1
```

Это эквивалентно запуску uvicorn **из venv проекта** (обходит глобальный `uvicorn` в PATH):

```powershell
cd app\backend
$env:IS_LAMBDA = "false"
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- Документация API: http://127.0.0.1:8000/docs  
- Локальные переменные: `app\backend\.env_development` (если `ENVIRONMENT` не `prod`)

---

## Фронт продакшена (Next.js, `app\web`)

Первый раз:

```powershell
cd app\web
npm install
```

Каждый запуск (бэкенд на `:8000` должен быть запущен):

```powershell
cd app\web
npm run dev
```

Открой **http://localhost:3000/admin/login** — вход по email/паролю админа (те же учётные данные, что для API). В dev Next проксирует `/api/*` на `http://127.0.0.1:8000` (см. `app\web\next.config.ts`).

Если API на другом хосте без proxy — задайте `NEXT_PUBLIC_API_BASE_URL` (например в `app\web\.env.local`).

---

## Legacy Vite (архив)

Старый SPA лежит в `archive\frontend-vite\` — **не** используется для продакшена. Разработка — только `app\web` (Next.js).

---

## Порядок

1. PostgreSQL  
2. Бэкенд (первый терминал)  
3. Фронт Next `app\web` (второй терминал) для админки и основного сайта

Тестовый админ (только dev): в `.env_development` (не коммитить) можно задать:
`ADMIN_USER_ID`, `ADMIN_USER_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`.  
Email должен проходить валидацию `EmailStr` (не используйте домены вроде `*.local` — их отклоняет `email-validator`). Пример: `dev-admin@example.com` + пароль из `ADMIN_BOOTSTRAP_PASSWORD`.  
При старте с `ENVIRONMENT=dev`, если у этого админа нет `password_hash`, он один раз выставляется из bootstrap-пароля.
