# NutryAI — CLAUDE.md

## Project Overview

NutryAI is a full-stack AI-powered nutrition tracking and meal planning application. Users log meals (with photo recognition), track macros/micronutrients, plan meals with AI, and chat with an AI nutrition advisor.

**Production URL:** https://nutriaidiary.com
**API URL:** https://api.nutriaidiary.com

---

## Monorepo Structure

```
my-app/
├── app/
│   ├── backend/          # FastAPI Python backend
│   ├── web/              # Next.js 15 frontend
│   ├── docker/           # Dockerfiles
│   ├── scripts/          # Deployment scripts
│   └── docker-compose.yml
├── docs/                 # Design and architecture docs
├── MEMORY_BANK.md        # Dev guidelines (migrations, git workflow)
└── appdev.md             # Local dev setup and patterns
```

---

## Tech Stack

### Backend (`app/backend/`)
- **FastAPI** 0.110+ with async SQLAlchemy 2.0
- **Database:** PostgreSQL (asyncpg) in prod, SQLite (aiosqlite) for local dev
- **Migrations:** Alembic
- **Auth:** JWT (python-jose + bcrypt)
- **AI:** OpenRouter API via OpenAI SDK (model: `gemini-2.5-flash-image` for images)
- **Streaming:** sse-starlette (SSE for chat)
- **Lambda support:** Mangum wrapper

### Frontend (`app/web/`)
- **Next.js 15** (App Router) + TypeScript
- **UI:** shadcn/ui + Radix UI + Tailwind CSS 3.4
- **State:** TanStack React Query 5 (server state) + React Context (client state)
- **Forms:** react-hook-form + Zod
- **Charts:** Recharts
- **HTTP:** axios

---

## Architecture

### Backend Layered Pattern
```
routers/      → HTTP endpoints (thin, just validate + call service)
services/     → Business logic, DB queries, external API calls
models/       → SQLAlchemy ORM models
schemas/      → Pydantic request/response models
core/         → Config (Settings), DB init, auth, enums
dependencies/ → FastAPI Depends() — auth guards, DB sessions
middleware/   → HTTP middleware
```

**Auto-discovery in `main.py`:**
- All routers in `routers/` that export `router` or `admin_router` are auto-registered
- Services with `MODULE_IMPORTS_*` / `MODULE_STARTUP_*` markers are auto-loaded

### Frontend Structure
```
src/app/           → Next.js App Router pages and layouts
src/app/api/       → Next.js API routes (AI streaming proxy)
src/components/    → Reusable React components
src/lib/           → API clients, auth, config, utilities
src/contexts/      → React Context
src/hooks/         → Custom hooks
src/views/         → Page-level view components
```

**API integration:**
- `src/lib/api.ts` — main SDK client (lazy initialization)
- `src/lib/config.ts` — dynamic config fetched from `/api/config` or env vars
- `/api/v1/aihub/*` — Next.js proxy for streaming AI responses

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | Accounts: id (string), email, password_hash, role, is_active |
| `user_profiles` | Health info: age, height, weight, goals, allergies, 40+ nutrient targets |
| `meal_logs` | Food entries: macros + 20+ micronutrient fields, photo_url, logged_at |
| `recipes` | User recipes with nutrition info, ingredients, instructions |
| `meal_plans` | AI-generated weekly plans (JSON), week_start |
| `chat_messages` | AI chat history: role, content |
| `water_logs` | Water intake: amount_ml, logged_at |
| `weight_logs` | Weight tracking: weight_kg, logged_at |
| `payments` | YooKassa payments: amount, status, yookassa_payment_id |

**Micronutrients tracked:** fiber, sugar, sodium, cholesterol, sat/trans fat, vitamins A/C/D/E/K/B1-B12, calcium, iron, magnesium, phosphorus, potassium, zinc, copper, manganese, selenium.

---

## API Endpoints

| Group | Prefix | Notes |
|-------|--------|-------|
| Auth | `/api/v1/auth` | POST /register, POST /login |
| Entities | `/api/v1/entities/{resource}` | CRUD for meal_logs, recipes, meal_plans, chat_messages, water_logs, weight_logs, user_profiles |
| AI | `/api/v1/aihub`, `/api/v1/ai/` | Streaming chat, image analysis, nutrient insights |
| Admin | `/api/v1/admin/` | Users, payments, settings management |
| Storage | `/api/v1/storage` | Photo upload/download |
| Health | `/health` | Health check |

---

## Environment Configuration

### Backend (`.env` / `.env_development`)
```
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET_KEY=...
JWT_EXPIRE_MINUTES=60
FRONTEND_URL=https://nutriaidiary.com
APP_AI_BASE_URL=https://openrouter.ai/api/v1
APP_AI_KEY=...
ENVIRONMENT=prod   # or dev — loads .env_development automatically
PORT=8000
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_BASE_URL=https://api.nutriaidiary.com
NEXT_PUBLIC_SITE_URL=https://nutriaidiary.com
INTERNAL_API_BASE_URL=http://127.0.0.1:8000  # for server-side AI proxy
```

---

## Development Patterns

### Backend
1. **Async-first** — all I/O must be async (DB, HTTP, streaming)
2. **Thin routers** — route handlers only validate input and call service layer
3. **Dependency injection** — use `Depends()` for DB sessions and auth
4. **Pydantic everywhere** — all request/response data goes through schemas
5. **Connection pooling** — NullPool for Lambda, QueuePool for VM

### Frontend
1. **React Query for server state** — no manual fetch/useState for API data
2. **Skeleton loaders** — always provide loading states (Dashboard, MealPlan, Analytics)
3. **Streaming via proxy** — AI chat goes through `/api/v1/aihub/` Next.js proxy route
4. **Lazy loading** — dynamic imports for heavy page components
5. **Zod validation** — all forms validated with Zod schemas

### Database
1. **Alembic for all schema changes** — never modify schema directly, always create migration
2. **Indexes on** `user_id` and `logged_at` columns for performance
3. **Async sessions only** — use `AsyncSession` via `get_db()` dependency

### Code Style
- Backend: Python type hints everywhere, follow FastAPI/Pydantic conventions
- Frontend: TypeScript strict mode, no `any` types
- Components: shadcn/ui patterns, Tailwind for all styling (no CSS modules or inline styles)

---

## Running Locally

```bash
# Full stack with Docker Compose
cd my-app/app
docker-compose up

# Backend only
cd my-app/app/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend only
cd my-app/app/web
npm install
npm run dev
```

Backend runs on `http://localhost:8000`, frontend on `http://localhost:3000`.

---

## Deployment

- **Local dev:** Docker Compose
- **Production:** Yandex Cloud VM with systemd services + Nginx
- **Lambda option:** Mangum wrapper (use NullPool for DB connections)
- **CI/CD:** GitHub Actions — Next.js build check + backend syntax check

See `DEPLOY_YC.md` for Yandex Cloud deployment steps.

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `app/backend/main.py` | FastAPI app entry, auto-discovery of routers/services |
| `app/backend/core/config.py` | All backend settings (Pydantic BaseSettings) |
| `app/backend/core/database.py` | DatabaseManager, async engine setup |
| `app/backend/dependencies/auth.py` | `get_current_user` dependency |
| `app/web/src/lib/api.ts` | Frontend API client |
| `app/web/src/lib/config.ts` | Frontend config loader |
| `app/web/src/app/api/v1/aihub/` | AI streaming proxy routes |
| `MEMORY_BANK.md` | Dev workflow guidelines |
| `appdev.md` | Local setup troubleshooting |
