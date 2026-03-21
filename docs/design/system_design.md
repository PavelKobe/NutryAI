# NutriAI — Системный дизайн

**Версия**: 2.1  
**Дата**: 2026-03-20  
**Автор**: Bob (Architect)  
**Основание**: PRD v1.3 (`/workspace/docs/design/prd.md`)

> **Changelog v2.1**: Добавлен вариант Demo-версии на Atoms Cloud (полный стек). Два режима деплоя: Demo и Production.
> **Changelog v2.0**: Миграция с Vite SPA на Next.js 14+ SSR, деплой на Yandex Cloud, интеграция ЮKassa для платежей.

---

## 0. Два варианта деплоя

NutriAI поддерживает **два варианта архитектуры деплоя** для разных этапов жизненного цикла:

| Параметр | 🧪 Demo-версия (Atoms Cloud) | 🚀 Production (Yandex Cloud) |
|---|---|---|
| **Назначение** | Быстрый прототип, демонстрация инвесторам, тестирование гипотез, MVP | Полноценный продукт для пользователей РФ/СНГ |
| **Frontend** | Vite + React SPA (существующий шаблон) | Next.js 14+ App Router (SSR) |
| **Backend** | Atoms Cloud (Auth + DB + Storage + Edge Functions) | Atoms Cloud (Auth + Edge Functions) + Yandex Cloud (DB + Storage + Deploy) |
| **БД** | Atoms Cloud Database (PostgreSQL) | Yandex Managed PostgreSQL (серверы в РФ) |
| **File Storage** | Atoms Cloud Storage | Yandex Object Storage (S3) |
| **Auth** | Atoms Cloud Auth (Email + Google) | Atoms Cloud Auth (Email + Google + VK ID + Яндекс ID) |
| **Платежи** | Нет (все функции бесплатны для демо) | ЮKassa (МИР, СБП, Visa/MC) |
| **Деплой** | Atoms Cloud (автоматический) | Yandex Serverless Containers (Docker) |
| **SSR/SEO** | Нет (SPA) | Да (SSR, SSG, ISR) |
| **152-ФЗ** | Не требуется (демо) | Да (данные в РФ) |
| **CDN** | Atoms Cloud CDN | Yandex CDN |
| **Стоимость** | Бесплатно / минимальная (Atoms Cloud план) | ~9,000-17,000 руб/мес |
| **Время запуска** | 2-3 недели | 10-12 недель |
| **ИИ-модели** | Atoms Cloud Edge Functions (все 4 модели) | Atoms Cloud Edge Functions (все 4 модели) |

### 0.1 Когда использовать Demo-версию

- ✅ Быстрая демонстрация продукта инвесторам/партнёрам
- ✅ Тестирование ИИ-функций (распознавание еды, чат, планы питания)
- ✅ Валидация UX/UI с реальными пользователями (до 100 человек)
- ✅ Хакатоны, питч-деки, конкурсы стартапов
- ❌ Не подходит для production с реальными платежами
- ❌ Не соответствует 152-ФЗ (данные не в РФ)

### 0.2 Путь миграции Demo → Production

```
Demo (Atoms Cloud)                    Production (Yandex Cloud)
─────────────────                    ──────────────────────────
Vite + React SPA          ──→       Next.js 14+ App Router (SSR)
Atoms Cloud DB             ──→       Yandex Managed PostgreSQL
Atoms Cloud Storage        ──→       Yandex Object Storage
Нет платежей               ──→       ЮKassa интеграция
Atoms Cloud Deploy         ──→       Yandex Serverless Containers
Email + Google Auth        ──→       + VK ID + Яндекс ID
```

**Что переносится без изменений:**
- Atoms Cloud Auth (JWT, сессии)
- Atoms Cloud Edge Functions (все ИИ-вызовы)
- Все ИИ-промпты и логика
- Prisma-схема (совместима с обеими БД)
- UI-компоненты (Shadcn-ui + Tailwind)

---

## 1. Подход к реализации

### 1.1 Ключевые технические вызовы и решения

| # | Вызов | Решение |
|---|---|---|
| 1 | **Точное распознавание российских блюд по фото** | Используем `gemini-2.5-pro` (мультимодальная модель) с кастомным промптом, обогащённым российскими блюдами. Результат верифицируется по локальной базе `food_database` (50K+ продуктов РФ). Точность более 85% |
| 2 | **Генерация персонализированных планов питания** | `gpt-5-chat` с детальным промптом, включающим все параметры пользователя (цели, КБЖУ, аллергии, бюджет в руб, магазины, кухни). Ответ в структурированном JSON. Валидация на бэкенде |
| 3 | **Контекстный ИИ-чат на русском языке** | `claude-4-5-sonnet` с системным промптом, содержащим профиль пользователя, историю питания за 7 дней, текущие цели. Знание российских продуктов и реалий |
| 4 | **SSR + Mobile-first PWA (Production)** | Next.js 14+ App Router с SSR для SEO-критичных страниц (лендинг, рецепты, блог) и CSR для интерактивных (дашборд, чат). PWA через `next-pwa`. Камера через `navigator.mediaDevices.getUserMedia()` |
| 5 | **Быстрый запуск Demo** | Vite + React SPA на Atoms Cloud — полный стек (Auth, DB, Storage, Edge Functions) без внешних зависимостей. Запуск за 2-3 недели |
| 6 | **Масштабируемый бэкенд (Production)** | **Гибридная архитектура**: Atoms Cloud (Auth, Edge Functions для ИИ) + Yandex Cloud (PostgreSQL, Object Storage, деплой). Соответствие 152-ФЗ через хранение данных в РФ |
| 7 | **Локализация для РФ/СНГ** | База продуктов с приоритетом РФ (`region = 'RU'`), поддержка EAN-13, рецепты 6 кухонь, цены в руб, OAuth через VK ID и Яндекс ID |
| 8 | **Платежи в РФ (Production)** | ЮKassa (https://yookassa.ru/) — поддержка МИР, СБП, Visa, Mastercard, рекуррентные подписки, вебхуки для управления статусом |

### 1.2 Технологический стек

#### 1.2.1 Demo-версия (Atoms Cloud)

| Слой | Технология | Обоснование |
|---|---|---|
| **Frontend** | Vite + React 18 + TypeScript | Существующий шаблон, быстрая разработка, HMR |
| **UI** | Shadcn-ui + Tailwind CSS | Переиспользуемые компоненты |
| **Маршрутизация** | React Router v6 | SPA-навигация |
| **Состояние** | Zustand + TanStack Query v5 | Клиентское + серверное состояние |
| **Графики** | Recharts | Дашборд и аналитика |
| **Формы** | React Hook Form + Zod | Валидация |
| **Backend** | **Atoms Cloud** (полный стек) | Auth + Database + Storage + Edge Functions |
| **БД** | Atoms Cloud Database (PostgreSQL) | Managed, RLS, без настройки |
| **Auth** | Atoms Cloud Auth | JWT, OAuth (Email, Google) |
| **Storage** | Atoms Cloud Storage | Загрузка фото |
| **ИИ** | Atoms Cloud Edge Functions | gemini-2.5-pro, gpt-5-chat, claude-4-5-sonnet, gemini-2.5-flash-image |
| **Деплой** | Atoms Cloud (автоматический) | Нулевая настройка |

#### 1.2.2 Production-версия (Yandex Cloud)

| Слой | Технология | Обоснование |
|---|---|---|
| **Frontend** | **Next.js 14+ (App Router)** + TypeScript | SSR для SEO, серверные компоненты, API Routes |
| **UI** | Shadcn-ui + Tailwind CSS | Те же компоненты из Demo |
| **Состояние (клиент)** | Zustand | Лёгкий, простой API |
| **Серверное состояние** | TanStack Query v5 | Кэширование для Client Components |
| **Графики** | Recharts | React-нативные графики |
| **Формы** | React Hook Form + Zod | Типобезопасная валидация |
| **Backend (ИИ)** | Atoms Cloud Edge Functions | Serverless вызовы ИИ-моделей |
| **Backend (API)** | Next.js API Routes (Route Handlers) | CRUD, платежи, аналитика |
| **БД** | **Yandex Managed PostgreSQL** | Серверы в РФ (152-ФЗ), автобэкапы |
| **ORM** | Prisma | Типобезопасные запросы, миграции |
| **Auth** | Atoms Cloud Auth | JWT, OAuth (Google, VK ID, Яндекс ID) |
| **File Storage** | **Yandex Object Storage** (S3) | CDN, серверы в РФ |
| **CDN** | **Yandex CDN** | Раздача статики из РФ |
| **Платежи** | **ЮKassa** (yookassa.ru) | МИР, СБП, Visa/MC, рекуррентные подписки |
| **ИИ-модели** | gemini-2.5-pro, gpt-5-chat, claude-4-5-sonnet, gemini-2.5-flash-image | Специализация по задачам |
| **Деплой** | **Yandex Serverless Containers** | Docker, автомасштабирование |
| **CI/CD** | GitHub Actions | Автодеплой при push в main |
| **Тестирование** | Playwright MCP | E2E UI-тесты |

### 1.3 SSR-стратегия (Next.js App Router — только Production)

| Тип страницы | Рендеринг | Обоснование |
|---|---|---|
| **Лендинг** (`/`) | SSG (Static) | SEO, максимальная скорость |
| **Страница входа/регистрации** (`/auth/*`) | SSR | Проверка сессии на сервере |
| **Онбординг** (`/onboarding`) | CSR (Client) | Интерактивная форма, не нужен SEO |
| **Дашборд** (`/dashboard`) | SSR + CSR hydration | Начальные данные с сервера |
| **План питания** (`/meal-plan`) | SSR | Данные загружаются на сервере |
| **Рецепт** (`/recipes/[id]`) | SSR + ISR (revalidate: 3600) | SEO для публичных рецептов |
| **Добавить еду** (`/add-food/*`) | CSR | Камера, интерактивность |
| **Чат** (`/chat`) | CSR | Real-time взаимодействие |
| **Аналитика** (`/analytics`) | SSR + CSR | Начальные графики с сервера |
| **Профиль** (`/profile/*`) | SSR | Данные пользователя |
| **Блог/SEO-страницы** (`/blog/*`) | SSG + ISR | SEO-контент |

### 1.4 Задачи реализации

#### Фаза 0: Demo-версия (2-3 недели)

1. **Настройка Atoms Cloud** — Создание проекта, настройка Auth, Database, Storage, Edge Functions
2. **Аутентификация** — Email/пароль + Google OAuth через Atoms Cloud Auth
3. **Онбординг** — 5-шаговая анкета, расчёт КБЖУ-целей
4. **Распознавание еды по фото** — Камера, загрузка в Atoms Cloud Storage, Edge Function (gemini-2.5-pro)
5. **Дневник питания** — CRUD через Atoms Cloud Database
6. **План питания** — Генерация через Edge Function (gpt-5-chat)
7. **ИИ-чат-бот** — Edge Function (claude-4-5-sonnet)
8. **Дашборд** — Прогресс КБЖУ, Recharts графики
9. **Деплой Demo** — Публикация через Atoms Cloud

#### Фаза 1: Production MVP (10-12 недель)

1. **Миграция на Next.js 14+** — App Router, SSR, API Routes, Prisma
2. **Подключение Yandex Cloud** — Managed PostgreSQL, Object Storage, CDN
3. **Миграция данных** — Atoms Cloud DB к Yandex Managed PostgreSQL (Prisma migrate)
4. **OAuth расширение** — Добавление VK ID и Яндекс ID
5. **Интеграция ЮKassa** — Подписки (499 руб/799 руб), вебхуки, рекуррентные платежи
6. **SSR оптимизация** — ISR для рецептов, SSG для лендинга
7. **Генерация рецептов** — gpt-5-chat + gemini-2.5-flash-image (изображения)
8. **Аналитика** — SSR графики, дневная/недельная/месячная статистика
9. **Деплой на Yandex Cloud** — Docker, Serverless Containers, CI/CD

---

## 2. Основные паттерны взаимодействия пользователя с UI

### 2.1 Онбординг (первый запуск)

1. Пользователь регистрируется через email или OAuth (VK ID / Яндекс ID / Google)
2. Проходит 5-шаговую анкету: пол/возраст, рост/вес, цели/активность, аллергии/предпочтения, бюджет/магазины/город/кухни
3. Система рассчитывает персональные КБЖУ-цели
4. Пользователь попадает на дашборд с первым сгенерированным планом питания

### 2.2 Ежедневное использование (основной цикл)

1. **Утро**: Пользователь открывает дашборд, видит прогресс КБЖУ (0%), следующий приём пищи из плана, инсайт от ИИ
2. **Приём пищи**: Нажимает «Добавить еду», фотографирует тарелку, ИИ распознаёт продукты за 3-5 сек, корректирует порции при необходимости, сохраняет в дневник
3. **Между приёмами**: Открывает чат с ИИ-нутрициологом, задаёт вопрос, получает персонализированный ответ
4. **Готовка**: Переходит в план питания, открывает рецепт, видит ингредиенты, шаги, КБЖУ, фото блюда
5. **Вечер**: Проверяет дашборд, видит итоговый прогресс за день, записывает вес (опционально)

### 2.3 Еженедельное использование

1. Просматривает аналитику за неделю (графики, тренды)
2. Генерирует новый план питания на следующую неделю
3. Формирует список покупок из плана (v2.0)

### 2.4 Подписка и оплата (только Production)

1. Пользователь нажимает «Перейти на Премиум», видит сравнение тарифов
2. Выбирает тариф (499 руб/мес или 799 руб/мес) и период (месяц/год)
3. Перенаправляется на платёжную форму ЮKassa, оплачивает (МИР/СБП/карта)
4. Вебхук ЮKassa подтверждает платёж, статус подписки обновляется
5. Автопродление через рекуррентные платежи ЮKassa

### 2.5 Навигация

- **Bottom Tab Bar** (5 табов): Дашборд | План | Добавить | Чат | Аналитика
- **Header**: Логотип + иконка профиля (настройки, подписка, выход)
- **Глубина**: максимум 3 уровня (таб, список, детали)
- **Возврат**: кнопка назад на каждом вложенном экране

---

## 3. Архитектура системы

```plantuml
' См. /workspace/docs/design/architect.plantuml
```

### 3.1 Архитектура Demo-версии (Atoms Cloud)

```
Пользователь (Browser)
    |
Vite + React SPA
    |
    +--- Atoms Cloud Auth (Email + Google, JWT)
    |
    +--- Atoms Cloud Database (PostgreSQL, RLS)
    |
    +--- Atoms Cloud Storage (фото еды, рецептов)
    |
    +--- Atoms Cloud Edge Functions (ИИ)
              |
              +--- gemini-2.5-pro (распознавание еды)
              +--- gpt-5-chat (планы, рецепты)
              +--- claude-4-5-sonnet (чат-бот)
              +--- gemini-2.5-flash-image (изображения)
```

**Преимущества Demo на Atoms Cloud:**
- Нулевая настройка инфраструктуры
- Единая платформа для всех сервисов
- Быстрый старт (дни, не недели)
- Бесплатный/минимальный тариф для прототипа
- Встроенный CDN и SSL

### 3.2 Архитектура Production-версии (Yandex Cloud + Atoms Cloud)

#### Frontend (Next.js 14+ App Router)
- **Server Components** — SSR-рендеринг страниц, загрузка данных через Prisma
- **Client Components** — Интерактивные элементы (камера, чат, формы, графики)
- **API Routes (Route Handlers)** — REST API для CRUD, вебхуки ЮKassa
- **Server Actions** — Мутации данных (сохранение профиля, логов)
- **Middleware** — Проверка JWT, редиректы для неавторизованных
- **Shadcn-ui + Tailwind CSS** — UI-компоненты и стилизация
- **Zustand** — Клиентское состояние (UI state)
- **TanStack Query** — Кэширование и ревалидация для Client Components
- **Recharts** — Графики дашборда и аналитики
- **Camera API** — Доступ к камере устройства для фото еды

#### Backend (Гибридная архитектура)

##### Atoms Cloud (ИИ + Auth)
- **Auth Service** — Управление сессиями, JWT-токены, OAuth-провайдеры (Google, VK ID, Яндекс ID)
- **Edge Functions** — Serverless-функции для вызова ИИ-моделей (6 функций)

##### Yandex Cloud (Данные + Инфраструктура)
- **Yandex Managed PostgreSQL** — Основная БД, серверы в РФ (Москва), 152-ФЗ
- **Yandex Object Storage** — S3-совместимое хранилище (фото еды, рецептов, аватары)
- **Yandex CDN** — Раздача статики и изображений
- **Yandex Serverless Containers** — Деплой Next.js приложения
- **Yandex Container Registry** — Docker-образы

##### ЮKassa (Платежи — только Production)
- **Payment API** — Создание платежей, подписок
- **Webhooks** — Уведомления о статусе платежей
- **Рекуррентные платежи** — Автопродление подписок

#### ИИ-модели (общие для Demo и Production)
- Вызываются **только из Atoms Cloud Edge Functions** (никогда напрямую с клиента)
- Каждая функция использует специализированную модель (см. PRD раздел 6.3)
- Промпты содержат контекст пользователя из БД

### 3.3 API Endpoints

#### Next.js API Routes (Route Handlers) — Production

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/onboarding/profile` | Сохранение профиля, расчёт КБЖУ |
| GET/POST/PUT/DELETE | `/api/meal-logs/*` | CRUD дневника питания |
| GET/POST/DELETE | `/api/weight-logs/*` | CRUD логов веса |
| GET | `/api/analytics/daily` | Дневная статистика |
| GET | `/api/analytics/weekly` | Недельная статистика |
| GET | `/api/analytics/monthly` | Месячная статистика |
| GET | `/api/analytics/trends` | Тренды |
| GET | `/api/recipes/[id]` | Получение рецепта |
| GET | `/api/recipes` | Список рецептов с фильтрами |
| GET | `/api/food/search` | Поиск по базе продуктов |
| POST | `/api/payments/create` | Создание платежа ЮKassa |
| POST | `/api/payments/webhook` | Вебхук ЮKassa (подтверждение оплаты) |
| GET | `/api/payments/subscription` | Статус подписки |
| POST | `/api/payments/cancel` | Отмена подписки |

#### Atoms Cloud Edge Functions (ИИ) — общие для Demo и Production

| Функция | Метод | Путь | ИИ-модель | Описание |
|---|---|---|---|---|
| `food-recognize` | POST | `/api/ai/food/recognize` | gemini-2.5-pro | Распознавание еды по фото |
| `meal-plan-generate` | POST | `/api/ai/meal-plans/generate` | gpt-5-chat | Генерация недельного плана |
| `meal-plan-regenerate` | POST | `/api/ai/meal-plans/regenerate` | gpt-5-chat | Регенерация приёма пищи |
| `recipe-generate` | POST | `/api/ai/recipes/generate` | gpt-5-chat | Генерация рецепта |
| `recipe-image-generate` | POST | `/api/ai/recipes/image` | gemini-2.5-flash-image | Генерация изображения рецепта |
| `chat-nutritionist` | POST | `/api/ai/chat/send` | claude-4-5-sonnet | Сообщение ИИ-нутрициологу |

### 3.4 Поток данных

#### Demo (Atoms Cloud)
```
Пользователь - React SPA - (JWT) - Atoms Cloud Edge Functions / DB / Storage - ИИ-модели
```

#### Production (Yandex Cloud)
```
Пользователь
    |
Next.js (SSR / Client)
    |                          |
Next.js API Routes          Atoms Cloud Edge Functions
(CRUD, Payments)            (ИИ-вызовы)
    |                          |
Yandex Managed PostgreSQL   ИИ-модели (Gemini, GPT, Claude)
(Prisma ORM)
    |
Yandex Object Storage (фото)
    |
Yandex CDN - Пользователь
```

### 3.5 Интеграция ЮKassa (только Production)

#### Поток оплаты подписки

```
1. Пользователь выбирает тариф - POST /api/payments/create
2. Сервер создаёт платёж через ЮKassa API:
   POST https://api.yookassa.ru/v3/payments
   {
     "amount": {"value": "499.00", "currency": "RUB"},
     "confirmation": {"type": "redirect", "return_url": "https://nutriai.ru/profile/subscription?status=success"},
     "capture": true,
     "description": "Подписка NutriAI Премиум (1 месяц)",
     "save_payment_method": true,
     "metadata": {"user_id": "uuid", "plan": "premium", "period": "monthly"}
   }
3. ЮKassa возвращает confirmation_url - редирект пользователя
4. Пользователь оплачивает (МИР / СБП / Visa / MC)
5. ЮKassa отправляет вебхук - POST /api/payments/webhook
   {
     "event": "payment.succeeded",
     "object": {"id": "...", "status": "succeeded", "payment_method": {"saved": true, "id": "pm_..."}}
   }
6. Сервер обновляет subscription в БД
7. Cron-задача (ежедневно): проверяет истекающие подписки - создаёт рекуррентный платёж
```

#### Тарифы ЮKassa

| Тариф | Месяц | Год (скидка 17%) | payment_method |
|---|---|---|---|
| Премиум | 499 руб | 4,990 руб | МИР, СБП, Visa, MC |
| Премиум+ | 799 руб | 7,990 руб | МИР, СБП, Visa, MC |

### 3.6 Безопасность

- **Аутентификация**: JWT-токены через Atoms Cloud Auth, проверка в Next.js Middleware (Production) / на клиенте (Demo)
- **Авторизация**: Проверка `user_id` в каждом запросе, RLS в Atoms Cloud DB (Demo), Prisma-фильтры (Production)
- **API**: API Routes проверяют JWT, Edge Functions проверяют JWT
- **Хранилище**: Приватные бакеты, доступ через подписанные URL (presigned URLs)
- **ИИ**: Модели вызываются только из Edge Functions, API-ключи не попадают на клиент
- **Платежи (Production)**: ЮKassa вебхуки верифицируются по IP-адресу + подписи
- **152-ФЗ (Production)**: Персональные данные в Yandex Managed PostgreSQL (Москва, РФ)
- **HTTPS**: Обязательно для всех соединений

---

## 4. Навигация UI (Конечный автомат)

```plantuml
' См. /workspace/docs/design/ui_navigation.plantuml
```

### 4.1 Описание навигационных путей

| Путь | Demo (SPA) | Production (SSR) | Глубина | Описание |
|---|---|---|---|---|
| `/` | CSR | SSG | 0 | Лендинг |
| `/auth/signin` | CSR | SSR | 1 | Вход (email/OAuth) |
| `/auth/signup` | CSR | SSR | 1 | Регистрация |
| `/onboarding` | CSR | CSR | 1 | 5-шаговая анкета |
| `/dashboard` | CSR | SSR+CSR | 1 | Дашборд КБЖУ |
| `/meal-plan` | CSR | SSR | 1 | Недельный план |
| `/meal-plan/[dayIndex]` | CSR | SSR | 2 | Детали дня |
| `/meal-plan/[dayIndex]/recipe/[id]` | CSR | SSR+ISR | 3 | Рецепт блюда |
| `/add-food` | CSR | CSR | 1 | Добавление еды |
| `/add-food/camera` | CSR | CSR | 2 | Камера |
| `/add-food/search` | CSR | CSR | 2 | Поиск продуктов |
| `/chat` | CSR | CSR | 1 | ИИ-чат |
| `/analytics` | CSR | SSR+CSR | 1 | Статистика |
| `/profile` | CSR | SSR | 1 | Профиль |
| `/profile/subscription` | — | SSR | 2 | Подписка (Production) |
| `/recipes/[id]` | CSR | SSR+ISR | 1 | Публичный рецепт |

---

## 5. Структуры данных и интерфейсы

```plantuml
' См. /workspace/docs/design/class_diagram.plantuml
```

### 5.1 Обзор доменных моделей

| Модель | Описание | Ключевые поля |
|---|---|---|
| **User** | Аккаунт пользователя | email, name, subscription_tier |
| **UserProfile** | Профиль с параметрами питания | goal, allergies, budget_per_week, city, cuisine_preferences |
| **MealLog** | Запись приёма пищи | meal_type, items (JSONB), photo_url, total КБЖУ |
| **MealPlan** | Недельный план питания | plan_data (JSONB: 7 дней x 3-4 приёма), status |
| **Recipe** | Рецепт блюда | ingredients, instructions, КБЖУ, cuisine, image_url |
| **ChatMessage** | Сообщение в чате с ИИ | role (user/assistant), content, context |
| **WeightLog** | Запись веса | weight_kg, logged_at |
| **ShoppingList** | Список покупок | items (JSONB), estimated_cost_rub |
| **FoodItem** | Продукт из базы | name, brand, barcode, КБЖУ per 100g, region |
| **Subscription** | Подписка (Production) | tier, status, expires_at, yookassa_payment_method_id |
| **Payment** | Запись о платеже (Production) | yookassa_payment_id, amount, status |

### 5.2 Сервисные интерфейсы

| Интерфейс | Методы | Demo | Production |
|---|---|---|---|
| **IAuthService** | signUp, signIn, signInWithOAuth, signOut, getSession | Atoms Cloud Auth | Atoms Cloud Auth |
| **IOnboardingService** | saveProfile, computeTargets | Atoms Cloud DB | Next.js API Route |
| **IFoodRecognitionService** | recognizeFromPhoto, searchFoodDatabase | Edge Function | Edge Function |
| **IMealPlanService** | generateWeeklyPlan, regenerateMeal, getActivePlan | Edge Function | Edge Function |
| **IRecipeService** | generateRecipe, getRecipe, listRecipes, generateRecipeImage | Edge Function | Edge Function + API Route |
| **IChatService** | sendMessage, getHistory, clearHistory | Edge Function | Edge Function |
| **IMealLogService** | createLog, updateLog, deleteLog, getLogsByDate | Atoms Cloud DB | Next.js API Route |
| **IWeightLogService** | logWeight, getWeightHistory, deleteLog | Atoms Cloud DB | Next.js API Route |
| **IAnalyticsService** | getDailySummary, getWeeklySummary, getMonthlySummary | Atoms Cloud DB | Next.js API Route |
| **IPaymentService** | createPayment, handleWebhook, getSubscription, cancelSubscription | — | Next.js API Route + ЮKassa |

### 5.3 Расчёт КБЖУ-целей (формула Mifflin-St Jeor)

```
BMR (муж) = 10 x вес(кг) + 6.25 x рост(см) - 5 x возраст - 161
BMR (жен) = 10 x вес(кг) + 6.25 x рост(см) - 5 x возраст + 5

TDEE = BMR x коэффициент_активности
  sedentary:    1.2
  light:        1.375
  moderate:     1.55
  active:       1.725
  very_active:  1.9

Целевые калории:
  lose:     TDEE - 500
  gain:     TDEE + 300
  maintain: TDEE

БЖУ:
  protein: 2.0 г/кг целевого веса
  fat:     0.8 г/кг целевого веса
  carbs:   (калории - protein*4 - fat*9) / 4
```

---

## 6. Диаграмма последовательности (основные сценарии)

```plantuml
' См. /workspace/docs/design/sequence_diagram.plantuml
```

### 6.1 Покрытые сценарии

1. **Регистрация и онбординг** — Полный путь от регистрации до первого дашборда
2. **Распознавание еды по фото** — Камера, загрузка, ИИ, верификация, сохранение в дневник
3. **Генерация плана питания** — Запрос, загрузка профиля, ИИ, сохранение плана и рецептов
4. **ИИ-чат-бот** — Загрузка истории, отправка сообщения, контекст пользователя, ИИ, ответ
5. **Генерация рецепта с изображением** — Запрос рецепта, генерация изображения, сохранение
6. **Загрузка дашборда** — Агрегация дневных данных + активный план
7. **Оплата подписки (Production)** — Выбор тарифа, ЮKassa, вебхук, обновление статуса

### 6.2 Ключевые паттерны взаимодействия

- **Demo**: Все данные через Atoms Cloud SDK (клиент напрямую к Atoms Cloud DB с RLS)
- **Production**: SSR для начальной загрузки через Prisma, CSR для интерактивности
- **Общее**: Все ИИ-вызовы через Atoms Cloud Edge Functions
- **Контекст пользователя** загружается из БД перед каждым ИИ-запросом
- **Фото** загружаются в Storage (Atoms Cloud или Yandex Object Storage)
- **Результаты распознавания** верифицируются по food_database
- **Платежи (Production)** обрабатываются асинхронно через вебхуки ЮKassa

---

## 7. ER-диаграмма базы данных

```plantuml
' См. /workspace/docs/design/er_diagram.plantuml
```

### 7.1 Обзор таблиц

| Таблица | Demo | Production | Записей (6 мес) | Индексы |
|---|---|---|---|---|
| `users` | да | да | 5,000 | PK, email (UNIQUE) |
| `user_profiles` | да | да | 5,000 | PK, user_id (UNIQUE FK) |
| `meal_logs` | да | да | 150,000 | PK, user_id + logged_at |
| `meal_plans` | да | да | 20,000 | PK, user_id + status |
| `recipes` | да | да | 50,000 | PK, user_id, cuisine, tags (GIN) |
| `chat_messages` | да | да | 500,000 | PK, user_id + created_at |
| `weight_logs` | да | да | 15,000 | PK, user_id + logged_at |
| `shopping_lists` | да | да | 10,000 | PK, user_id, meal_plan_id |
| `food_database` | да | да | 50,000+ | PK, barcode, name (GIN), region |
| `subscriptions` | нет | да | 5,000 | PK, user_id (UNIQUE FK) |
| `payments` | нет | да | 20,000 | PK, yookassa_payment_id (UNIQUE) |

### 7.2 Таблицы подписок и платежей (только Production)

```
Subscriptions
- id (UUID, PK)
- user_id (UUID, FK - Users, UNIQUE)
- tier (enum: free/premium/premium_plus)
- status (enum: active/cancelled/expired/past_due)
- current_period_start (timestamptz)
- current_period_end (timestamptz)
- yookassa_payment_method_id (string, nullable)
- cancel_at_period_end (boolean, default: false)
- created_at (timestamptz)
- updated_at (timestamptz)

Payments
- id (UUID, PK)
- user_id (UUID, FK - Users)
- subscription_id (UUID, FK - Subscriptions)
- yookassa_payment_id (string, UNIQUE)
- amount (decimal)
- currency (string, default: 'RUB')
- status (enum: pending/succeeded/cancelled/refunded)
- description (string)
- payment_method_type (string)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### 7.3 Особенности схемы

- **JSONB** для гибких структур: items, plan_data, ingredients
- **Demo**: Atoms Cloud Database с RLS (user_id = auth.uid())
- **Production**: Prisma ORM с Yandex Managed PostgreSQL
- **food_database** — общая для всех пользователей (без user_id)
- **subscriptions/payments** — только в Production
- **Prisma-схема совместима** с обеими БД (PostgreSQL)

---

## 8. Архитектура деплоя

### 8.1 Demo (Atoms Cloud)

```
┌──────────────────────────────────┐
|         Atoms Cloud              |
|                                  |
|  ┌────────────────────────────┐  |
|  | Vite + React SPA (Deploy)  |  |
|  └────────────────────────────┘  |
|                                  |
|  ┌──────────┐  ┌──────────────┐  |
|  | Auth     |  | Edge Funcs   |  |
|  | (JWT)    |  | (ИИ-модели)  |  |
|  └──────────┘  └──────────────┘  |
|                                  |
|  ┌──────────┐  ┌──────────────┐  |
|  | Database |  | Storage      |  |
|  | (PgSQL)  |  | (CDN)        |  |
|  └──────────┘  └──────────────┘  |
└──────────────────────────────────┘
```

**Стоимость Demo**: Бесплатно или минимальная (в рамках Atoms Cloud плана)

### 8.2 Production (Yandex Cloud)

```
┌───────────────────────────────────────────────────────┐
|                Yandex Cloud (ru-central1)              |
|                                                       |
|  ┌────────────────┐    ┌───────────────────────────┐  |
|  | Yandex CDN     |    | Yandex Serverless         |  |
|  | (статика)      |    | Containers                |  |
|  |                |    | ┌───────────────────────┐  |  |
|  |                |    | | Docker: Next.js App   |  |  |
|  |                |    | | (SSR + API Routes)    |  |  |
|  |                |    | └───────────────────────┘  |  |
|  └────────────────┘    └───────────────────────────┘  |
|                                  |                     |
|  ┌────────────────┐    ┌────────+──────────────────┐  |
|  | Yandex Object  |    | Yandex Managed PostgreSQL |  |
|  | Storage (S3)   |    | (ru-central1-a)           |  |
|  | - food-photos  |    | - PostgreSQL 16           |  |
|  | - recipe-imgs  |    | - 2 vCPU, 8GB RAM        |  |
|  | - avatars      |    | - 50GB SSD               |  |
|  └────────────────┘    └───────────────────────────┘  |
└───────────────────────────────────────────────────────┘
        |                              |
        v                              v
┌───────────────┐           ┌───────────────────┐
| Atoms Cloud   |           | ЮKassa            |
| - Auth        |           | - Payments API    |
| - Edge Funcs  |           | - Webhooks        |
|   (ИИ-модели) |           | - Рекуррентные    |
└───────────────┘           └───────────────────┘
```

### 8.3 Конфигурация Yandex Cloud (Production)

| Сервис | Конфигурация | Стоимость (оценка) |
|---|---|---|
| **Serverless Containers** | 1 контейнер, 1 vCPU, 2GB RAM, автомасштабирование 1-10 | ~3,000-8,000 руб/мес |
| **Managed PostgreSQL** | s2.micro (2 vCPU, 8GB), 50GB SSD, 1 реплика | ~5,000-7,000 руб/мес |
| **Object Storage** | Standard, ~50GB (фото) | ~500-1,000 руб/мес |
| **CDN** | По трафику, ~100GB/мес | ~500-1,000 руб/мес |
| **Container Registry** | ~5 образов | ~100 руб/мес |
| **Итого (MVP)** | | **~9,000-17,000 руб/мес** |

### 8.4 CI/CD Pipeline (Production)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Yandex Cloud
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t cr.yandex/$YC_REGISTRY_ID/nutriai:$GITHUB_SHA .
      - name: Push to Yandex Container Registry
        run: docker push cr.yandex/$YC_REGISTRY_ID/nutriai:$GITHUB_SHA
      - name: Deploy to Serverless Containers
        run: yc serverless container revision deploy ...
```

### 8.5 Переменные окружения

#### Demo (Atoms Cloud)
```env
VITE_ATOMS_CLOUD_URL=...
VITE_ATOMS_CLOUD_ANON_KEY=...
```

#### Production (Yandex Cloud)
```env
# Yandex Cloud
DATABASE_URL=postgresql://user:pass@host:6432/nutriai?sslmode=require
YC_OBJECT_STORAGE_BUCKET=nutriai-files
YC_OBJECT_STORAGE_KEY_ID=...
YC_OBJECT_STORAGE_SECRET=...

# Atoms Cloud
ATOMS_CLOUD_URL=...
ATOMS_CLOUD_ANON_KEY=...
ATOMS_CLOUD_SERVICE_KEY=...

# ЮKassa
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_WEBHOOK_SECRET=...

# Next.js
NEXT_PUBLIC_APP_URL=https://nutriai.ru
NEXT_PUBLIC_ATOMS_CLOUD_URL=...
```

---

## 9. Неясные аспекты и допущения

### 9.1 Допущения

| # | Допущение | Влияние |
|---|---|---|
| 1 | **Два варианта деплоя** | Demo на Atoms Cloud (быстрый старт), Production на Yandex Cloud (152-ФЗ, SSR, платежи) |
| 2 | **Next.js 14+ SSR для Production** | SSR для SEO-критичных страниц, CSR для интерактивных |
| 3 | **Vite + React SPA для Demo** | Существующий шаблон, быстрая разработка |
| 4 | **Yandex Cloud для Production** | Serverless Containers + Managed PostgreSQL + Object Storage. Соответствие 152-ФЗ |
| 5 | **ЮKassa для платежей (Production)** | МИР, СБП, Visa/MC, рекуррентные подписки |
| 6 | **Atoms Cloud для Demo** | Полный стек (Auth, DB, Storage, Edge Functions) без внешних зависимостей |
| 7 | **PWA вместо нативного приложения** | Достаточно для MVP. Камера через Web API |
| 8 | **Медицинский дисклеймер обязателен** | На онбординге и в футере |
| 9 | **Офлайн-режим НЕ в MVP** | Все операции требуют интернета |
| 10 | **Prisma-схема совместима** | Одна схема для обеих БД (Atoms Cloud PostgreSQL и Yandex Managed PostgreSQL) |

### 9.2 Открытые вопросы (требуют решения)

| # | Вопрос | Рекомендация |
|---|---|---|
| 1 | **Интеграция с реальными диетологами?** | Только ИИ в MVP. Человеческий коучинг в v3.0 |
| 2 | **Бюджет на ИИ API-вызовы?** | Free: 3 фото + 5 сообщений/день, Premium: безлимит |
| 3 | **Rate limiting для ИИ-функций?** | Free: 3 recognize + 5 chat + 1 plan/день |
| 4 | **Стратегия кэширования рецептов?** | Сохранение в БД + ISR (Production) |
| 5 | **Домен nutriai.ru** | Требуется регистрация |
| 6 | **Комиссия ЮKassa** | ~3.5% за транзакцию |

---

## Приложения

### A. Файлы диаграмм

| Файл | Описание |
|---|---|
| `architect.plantuml` | Архитектура системы (Production) |
| `class_diagram.plantuml` | Структуры данных, интерфейсы, DTO |
| `sequence_diagram.plantuml` | Диаграммы последовательности (7 сценариев) |
| `er_diagram.plantuml` | ER-диаграмма базы данных (11 таблиц) |
| `ui_navigation.plantuml` | Навигация UI (конечный автомат) |

### B. Ссылки

- PRD: `/workspace/docs/design/prd.md` (v1.3)
- Анализ конкурентов: `/workspace/analiz_konkurentov_ai_pitanie.md`
- Файловая структура: `/workspace/docs/design/file_tree.md`