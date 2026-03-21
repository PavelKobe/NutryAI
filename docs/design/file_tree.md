# NutriAI — Файловая структура проекта v2.1

> **Два варианта**: Demo (Atoms Cloud, Vite SPA) и Production (Yandex Cloud, Next.js SSR)

---

## Demo-версия (Atoms Cloud)

```
/workspace/
├── docs/
│   └── design/
│       ├── prd.md                          # PRD v1.3
│       ├── system_design.md                # Системный дизайн v2.1
│       ├── architect.plantuml              # Архитектура системы
│       ├── class_diagram.plantuml          # Диаграмма классов
│       ├── sequence_diagram.plantuml       # Диаграмма последовательности
│       ├── er_diagram.plantuml             # ER-диаграмма БД
│       ├── ui_navigation.plantuml          # Навигация UI
│       └── file_tree.md                    # Файловая структура (этот файл)
│
├── app/
│   └── nutriai-demo/                       # Vite + React SPA (Demo)
│       ├── public/
│       │   ├── manifest.json               # PWA-манифест
│       │   ├── favicon.ico
│       │   └── icons/                      # PWA-иконки
│       │
│       ├── src/
│       │   ├── main.tsx                    # Точка входа React
│       │   ├── App.tsx                     # Корневой компонент + React Router
│       │   ├── index.css                   # Глобальные стили (Tailwind)
│       │   │
│       │   ├── lib/
│       │   │   ├── atoms-cloud.ts          # Инициализация Atoms Cloud клиента
│       │   │   ├── auth.ts                 # Хелперы аутентификации
│       │   │   ├── storage.ts              # Хелперы загрузки файлов
│       │   │   ├── ai.ts                   # Вызовы Edge Functions (ИИ)
│       │   │   ├── nutrition-calc.ts       # Расчёт КБЖУ (Mifflin-St Jeor)
│       │   │   └── utils.ts               # Общие утилиты
│       │   │
│       │   ├── hooks/
│       │   │   ├── use-auth.ts             # Хук аутентификации
│       │   │   ├── use-meal-logs.ts        # CRUD дневника питания
│       │   │   ├── use-meal-plan.ts        # Управление планом питания
│       │   │   ├── use-recipes.ts          # Управление рецептами
│       │   │   ├── use-chat.ts             # Чат с ИИ
│       │   │   ├── use-weight-logs.ts      # CRUD логов веса
│       │   │   ├── use-analytics.ts        # Аналитика
│       │   │   ├── use-food-search.ts      # Поиск по базе продуктов
│       │   │   └── use-camera.ts           # Доступ к камере
│       │   │
│       │   ├── stores/
│       │   │   ├── auth-store.ts           # Zustand: состояние авторизации
│       │   │   ├── onboarding-store.ts     # Zustand: данные онбординга
│       │   │   └── ui-store.ts             # Zustand: UI-состояние
│       │   │
│       │   ├── types/
│       │   │   ├── user.ts                 # User, UserProfile
│       │   │   ├── meal.ts                 # MealLog, MealPlan, MealType
│       │   │   ├── recipe.ts               # Recipe, Ingredient
│       │   │   ├── chat.ts                 # ChatMessage
│       │   │   ├── food.ts                 # FoodItem, FoodRecognitionResult
│       │   │   ├── analytics.ts            # DailySummary, WeeklySummary
│       │   │   └── common.ts               # Общие типы
│       │   │
│       │   ├── components/
│       │   │   ├── ui/                     # Shadcn-ui компоненты (автогенерация)
│       │   │   │   ├── button.tsx
│       │   │   │   ├── card.tsx
│       │   │   │   ├── dialog.tsx
│       │   │   │   ├── input.tsx
│       │   │   │   ├── progress.tsx
│       │   │   │   ├── tabs.tsx
│       │   │   │   ├── avatar.tsx
│       │   │   │   ├── badge.tsx
│       │   │   │   ├── select.tsx
│       │   │   │   ├── slider.tsx
│       │   │   │   ├── textarea.tsx
│       │   │   │   └── ...
│       │   │   │
│       │   │   ├── layout/
│       │   │   │   ├── app-layout.tsx       # Основной layout с табами
│       │   │   │   ├── bottom-nav.tsx       # Bottom Tab Bar (5 табов)
│       │   │   │   ├── header.tsx           # Шапка с логотипом и профилем
│       │   │   │   └── auth-layout.tsx      # Layout для страниц авторизации
│       │   │   │
│       │   │   ├── auth/
│       │   │   │   ├── sign-in-form.tsx     # Форма входа
│       │   │   │   ├── sign-up-form.tsx     # Форма регистрации
│       │   │   │   └── oauth-buttons.tsx    # Кнопки OAuth (Google)
│       │   │   │
│       │   │   ├── onboarding/
│       │   │   │   ├── onboarding-wizard.tsx # 5-шаговый визард
│       │   │   │   ├── step-personal.tsx    # Шаг 1: Пол, возраст
│       │   │   │   ├── step-body.tsx        # Шаг 2: Рост, вес
│       │   │   │   ├── step-goals.tsx       # Шаг 3: Цели, активность
│       │   │   │   ├── step-diet.tsx        # Шаг 4: Аллергии, предпочтения
│       │   │   │   └── step-lifestyle.tsx   # Шаг 5: Бюджет, магазины, город, кухни
│       │   │   │
│       │   │   ├── dashboard/
│       │   │   │   ├── daily-progress.tsx   # Прогресс-бары КБЖУ
│       │   │   │   ├── macro-chart.tsx      # Круговая диаграмма БЖУ (Recharts)
│       │   │   │   ├── next-meal-card.tsx   # Карточка следующего приёма пищи
│       │   │   │   ├── ai-insight.tsx       # Инсайт от ИИ-коуча
│       │   │   │   ├── quick-add-food.tsx   # Быстрое добавление еды
│       │   │   │   └── meal-history.tsx     # История приёмов за день
│       │   │   │
│       │   │   ├── meal-plan/
│       │   │   │   ├── weekly-plan.tsx      # Недельный план (7 дней)
│       │   │   │   ├── day-plan.tsx         # План на день (3-4 приёма)
│       │   │   │   ├── meal-card.tsx        # Карточка приёма пищи
│       │   │   │   └── regenerate-button.tsx # Кнопка регенерации
│       │   │   │
│       │   │   ├── add-food/
│       │   │   │   ├── camera-capture.tsx   # Компонент камеры
│       │   │   │   ├── food-recognition-result.tsx # Результат распознавания
│       │   │   │   ├── food-item-editor.tsx # Редактирование порции
│       │   │   │   ├── food-search.tsx      # Поиск по базе
│       │   │   │   └── manual-entry.tsx     # Ручной ввод
│       │   │   │
│       │   │   ├── chat/
│       │   │   │   ├── chat-window.tsx      # Окно чата
│       │   │   │   ├── message-bubble.tsx   # Сообщение (user/assistant)
│       │   │   │   ├── chat-input.tsx       # Поле ввода + отправка
│       │   │   │   └── quick-questions.tsx  # Шаблоны быстрых вопросов
│       │   │   │
│       │   │   ├── analytics/
│       │   │   │   ├── daily-stats.tsx      # Дневная статистика
│       │   │   │   ├── weekly-chart.tsx     # Недельный график (Recharts)
│       │   │   │   ├── monthly-chart.tsx    # Месячный график
│       │   │   │   ├── weight-chart.tsx     # График динамики веса
│       │   │   │   └── trends-card.tsx      # Карточка трендов
│       │   │   │
│       │   │   ├── recipe/
│       │   │   │   ├── recipe-card.tsx      # Карточка рецепта (список)
│       │   │   │   ├── recipe-detail.tsx    # Детальная страница рецепта
│       │   │   │   ├── ingredients-list.tsx # Список ингредиентов
│       │   │   │   └── instructions-steps.tsx # Пошаговая инструкция
│       │   │   │
│       │   │   ├── profile/
│       │   │   │   ├── profile-info.tsx     # Личные данные
│       │   │   │   ├── diet-settings.tsx    # Диетические ограничения
│       │   │   │   └── weight-logger.tsx    # Форма записи веса
│       │   │   │
│       │   │   └── shared/
│       │   │       ├── loading-spinner.tsx   # Спиннер загрузки
│       │   │       ├── error-boundary.tsx    # Обработка ошибок
│       │   │       ├── empty-state.tsx       # Пустое состояние
│       │   │       ├── medical-disclaimer.tsx # Медицинский дисклеймер
│       │   │       └── nutrient-badge.tsx    # Бейдж КБЖУ
│       │   │
│       │   └── pages/
│       │       ├── landing.tsx              # Лендинг
│       │       ├── sign-in.tsx              # Страница входа
│       │       ├── sign-up.tsx              # Страница регистрации
│       │       ├── onboarding.tsx           # Онбординг
│       │       ├── dashboard.tsx            # Дашборд
│       │       ├── meal-plan.tsx            # План питания
│       │       ├── meal-plan-day.tsx        # Детали дня
│       │       ├── add-food.tsx             # Добавление еды
│       │       ├── add-food-camera.tsx      # Камера
│       │       ├── add-food-search.tsx      # Поиск продуктов
│       │       ├── chat.tsx                 # ИИ-чат
│       │       ├── analytics.tsx            # Аналитика
│       │       ├── recipe-detail.tsx        # Рецепт
│       │       └── profile.tsx              # Профиль
│       │
│       ├── atoms-cloud/
│       │   └── edge-functions/              # Atoms Cloud Edge Functions (ИИ)
│       │       ├── food-recognize/
│       │       │   └── index.ts             # gemini-2.5-pro: распознавание еды
│       │       ├── meal-plan-generate/
│       │       │   └── index.ts             # gpt-5-chat: генерация плана
│       │       ├── meal-plan-regenerate/
│       │       │   └── index.ts             # gpt-5-chat: регенерация приёма
│       │       ├── recipe-generate/
│       │       │   └── index.ts             # gpt-5-chat: генерация рецепта
│       │       ├── recipe-image-generate/
│       │       │   └── index.ts             # gemini-2.5-flash-image: изображение
│       │       └── chat-nutritionist/
│       │           └── index.ts             # claude-4-5-sonnet: чат-бот
│       │
│       ├── components.json                  # Shadcn-ui конфигурация
│       ├── tailwind.config.ts               # Tailwind CSS конфигурация
│       ├── tsconfig.json                    # TypeScript конфигурация
│       ├── vite.config.ts                   # Vite конфигурация
│       ├── package.json                     # Зависимости
│       └── .env.local                       # Переменные окружения (Atoms Cloud)
```

---

## Production-версия (Yandex Cloud + Next.js)

```
/workspace/
├── docs/
│   └── design/                             # (те же файлы дизайна)
│
├── app/
│   └── nutriai/                            # Next.js 14+ App (Production)
│       ├── public/
│       │   ├── manifest.json               # PWA-манифест
│       │   ├── sw.js                       # Service Worker (next-pwa)
│       │   ├── favicon.ico
│       │   └── icons/                      # PWA-иконки (192x192, 512x512)
│       │
│       ├── prisma/
│       │   ├── schema.prisma               # Prisma-схема (11 таблиц)
│       │   ├── migrations/                 # Автоматические миграции
│       │   └── seed.ts                     # Seed: food_database (50K+ продуктов)
│       │
│       ├── src/
│       │   ├── app/                        # Next.js App Router
│       │   │   ├── layout.tsx              # Root layout (шрифты, провайдеры)
│       │   │   ├── page.tsx                # Лендинг (SSG)
│       │   │   ├── globals.css             # Глобальные стили (Tailwind)
│       │   │   │
│       │   │   ├── (auth)/                 # Группа маршрутов: авторизация
│       │   │   │   ├── signin/page.tsx     # Страница входа (SSR)
│       │   │   │   ├── signup/page.tsx     # Страница регистрации (SSR)
│       │   │   │   ├── callback/page.tsx   # OAuth callback (SSR)
│       │   │   │   └── layout.tsx          # Layout для auth (без табов)
│       │   │   │
│       │   │   ├── onboarding/
│       │   │   │   └── page.tsx            # 5-шаговая анкета (CSR)
│       │   │   │
│       │   │   ├── (app)/                  # Группа маршрутов: основное приложение
│       │   │   │   ├── layout.tsx          # Layout с Bottom Tab Bar
│       │   │   │   │
│       │   │   │   ├── dashboard/
│       │   │   │   │   └── page.tsx        # Дашборд (SSR + CSR hydration)
│       │   │   │   │
│       │   │   │   ├── meal-plan/
│       │   │   │   │   ├── page.tsx        # Недельный план (SSR)
│       │   │   │   │   └── [dayIndex]/
│       │   │   │   │       ├── page.tsx    # Детали дня (SSR)
│       │   │   │   │       └── recipe/
│       │   │   │   │           └── [id]/
│       │   │   │   │               └── page.tsx  # Рецепт (SSR + ISR)
│       │   │   │   │
│       │   │   │   ├── add-food/
│       │   │   │   │   ├── page.tsx        # Выбор способа (CSR)
│       │   │   │   │   ├── camera/
│       │   │   │   │   │   └── page.tsx    # Камера + распознавание (CSR)
│       │   │   │   │   └── search/
│       │   │   │   │       └── page.tsx    # Поиск продуктов (CSR)
│       │   │   │   │
│       │   │   │   ├── chat/
│       │   │   │   │   └── page.tsx        # ИИ-чат (CSR)
│       │   │   │   │
│       │   │   │   └── analytics/
│       │   │   │       └── page.tsx        # Аналитика (SSR + CSR)
│       │   │   │
│       │   │   ├── profile/
│       │   │   │   ├── page.tsx            # Профиль (SSR)
│       │   │   │   ├── diet/
│       │   │   │   │   └── page.tsx        # Диетические ограничения (SSR)
│       │   │   │   └── subscription/
│       │   │   │       └── page.tsx        # Управление подпиской + ЮKassa (SSR)
│       │   │   │
│       │   │   ├── recipes/
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx        # Публичная страница рецепта (SSR + ISR)
│       │   │   │
│       │   │   ├── blog/
│       │   │   │   └── [...slug]/
│       │   │   │       └── page.tsx        # SEO-контент (SSG + ISR)
│       │   │   │
│       │   │   └── api/                    # Next.js API Routes (Route Handlers)
│       │   │       ├── onboarding/
│       │   │       │   └── profile/route.ts  # POST: сохранение профиля
│       │   │       │
│       │   │       ├── meal-logs/
│       │   │       │   ├── route.ts        # GET (list), POST (create)
│       │   │       │   └── [id]/route.ts   # GET, PUT, DELETE
│       │   │       │
│       │   │       ├── weight-logs/
│       │   │       │   ├── route.ts        # GET (list), POST (create)
│       │   │       │   └── [id]/route.ts   # GET, DELETE
│       │   │       │
│       │   │       ├── analytics/
│       │   │       │   ├── daily/route.ts  # GET: дневная статистика
│       │   │       │   ├── weekly/route.ts # GET: недельная статистика
│       │   │       │   ├── monthly/route.ts # GET: месячная статистика
│       │   │       │   └── trends/route.ts # GET: тренды
│       │   │       │
│       │   │       ├── recipes/
│       │   │       │   ├── route.ts        # GET: список рецептов
│       │   │       │   └── [id]/route.ts   # GET: рецепт по ID
│       │   │       │
│       │   │       ├── food/
│       │   │       │   └── search/route.ts # GET: поиск по базе продуктов
│       │   │       │
│       │   │       └── payments/
│       │   │           ├── create/route.ts    # POST: создание платежа ЮKassa
│       │   │           ├── webhook/route.ts   # POST: вебхук ЮKassa
│       │   │           ├── subscription/route.ts # GET: статус подписки
│       │   │           └── cancel/route.ts    # POST: отмена подписки
│       │   │
│       │   ├── lib/
│       │   │   ├── atoms-cloud.ts          # Инициализация Atoms Cloud клиента
│       │   │   ├── prisma.ts               # Prisma клиент (singleton)
│       │   │   ├── auth.ts                 # Хелперы аутентификации (JWT)
│       │   │   ├── yookassa.ts             # ЮKassa SDK/API клиент
│       │   │   ├── storage.ts              # Yandex Object Storage хелперы
│       │   │   ├── ai.ts                   # Вызовы Edge Functions (ИИ)
│       │   │   ├── nutrition-calc.ts       # Расчёт КБЖУ (Mifflin-St Jeor)
│       │   │   └── utils.ts               # Общие утилиты
│       │   │
│       │   ├── hooks/                      # (аналогично Demo)
│       │   │   ├── use-auth.ts
│       │   │   ├── use-meal-logs.ts
│       │   │   ├── use-meal-plan.ts
│       │   │   ├── use-recipes.ts
│       │   │   ├── use-chat.ts
│       │   │   ├── use-weight-logs.ts
│       │   │   ├── use-analytics.ts
│       │   │   ├── use-food-search.ts
│       │   │   ├── use-camera.ts
│       │   │   └── use-subscription.ts     # Управление подпиской (Production)
│       │   │
│       │   ├── stores/                     # (аналогично Demo)
│       │   │   ├── auth-store.ts
│       │   │   ├── onboarding-store.ts
│       │   │   └── ui-store.ts
│       │   │
│       │   ├── types/                      # (аналогично Demo + подписки)
│       │   │   ├── user.ts
│       │   │   ├── meal.ts
│       │   │   ├── recipe.ts
│       │   │   ├── chat.ts
│       │   │   ├── food.ts
│       │   │   ├── analytics.ts
│       │   │   ├── subscription.ts         # Subscription, Payment (Production)
│       │   │   └── common.ts
│       │   │
│       │   ├── components/                 # (аналогично Demo + подписки)
│       │   │   ├── ui/                     # Shadcn-ui компоненты
│       │   │   ├── layout/
│       │   │   │   ├── app-layout.tsx
│       │   │   │   ├── bottom-nav.tsx
│       │   │   │   ├── header.tsx
│       │   │   │   └── auth-layout.tsx
│       │   │   ├── auth/
│       │   │   ├── onboarding/
│       │   │   ├── dashboard/
│       │   │   ├── meal-plan/
│       │   │   ├── add-food/
│       │   │   ├── chat/
│       │   │   ├── analytics/
│       │   │   ├── recipe/
│       │   │   ├── profile/
│       │   │   │   ├── profile-info.tsx
│       │   │   │   ├── diet-settings.tsx
│       │   │   │   ├── weight-logger.tsx
│       │   │   │   └── subscription-manager.tsx  # Управление подпиской (Production)
│       │   │   └── shared/
│       │   │
│       │   └── middleware.ts               # Next.js Middleware (JWT проверка, редиректы)
│       │
│       ├── atoms-cloud/
│       │   └── edge-functions/             # (те же Edge Functions что и в Demo)
│       │       ├── food-recognize/
│       │       │   └── index.ts
│       │       ├── meal-plan-generate/
│       │       │   └── index.ts
│       │       ├── meal-plan-regenerate/
│       │       │   └── index.ts
│       │       ├── recipe-generate/
│       │       │   └── index.ts
│       │       ├── recipe-image-generate/
│       │       │   └── index.ts
│       │       └── chat-nutritionist/
│       │           └── index.ts
│       │
│       ├── Dockerfile                      # Docker для Yandex Serverless Containers
│       ├── .github/
│       │   └── workflows/
│       │       └── deploy.yml              # CI/CD: GitHub Actions → Yandex Cloud
│       │
│       ├── next.config.ts                  # Next.js конфигурация (PWA, images)
│       ├── components.json                 # Shadcn-ui конфигурация
│       ├── tailwind.config.ts              # Tailwind CSS конфигурация
│       ├── tsconfig.json                   # TypeScript конфигурация
│       ├── package.json                    # Зависимости
│       ├── .env.local                      # Переменные окружения (Production)
│       └── .env.example                    # Пример переменных окружения
```

---

## Общие Edge Functions (Atoms Cloud)

Edge Functions идентичны для Demo и Production — они вызываются из Atoms Cloud и не зависят от варианта деплоя:

| Функция | Файл | ИИ-модель | Описание |
|---|---|---|---|
| `food-recognize` | `edge-functions/food-recognize/index.ts` | gemini-2.5-pro | Распознавание еды по фото |
| `meal-plan-generate` | `edge-functions/meal-plan-generate/index.ts` | gpt-5-chat | Генерация недельного плана |
| `meal-plan-regenerate` | `edge-functions/meal-plan-regenerate/index.ts` | gpt-5-chat | Регенерация приёма пищи |
| `recipe-generate` | `edge-functions/recipe-generate/index.ts` | gpt-5-chat | Генерация рецепта |
| `recipe-image-generate` | `edge-functions/recipe-image-generate/index.ts` | gemini-2.5-flash-image | Генерация изображения |
| `chat-nutritionist` | `edge-functions/chat-nutritionist/index.ts` | claude-4-5-sonnet | ИИ-чат нутрициолог |

---

## Переиспользуемые компоненты (Demo → Production)

Следующие модули переносятся из Demo в Production без изменений:

| Модуль | Путь | Описание |
|---|---|---|
| UI-компоненты | `components/ui/*` | Shadcn-ui (Button, Card, Dialog и т.д.) |
| Бизнес-компоненты | `components/dashboard/*`, `chat/*`, `add-food/*` и т.д. | Все UI-компоненты |
| Типы | `types/*` | TypeScript-типы |
| Хуки | `hooks/*` | React-хуки (кроме use-subscription) |
| Сторы | `stores/*` | Zustand-сторы |
| Утилиты | `lib/nutrition-calc.ts`, `lib/utils.ts` | Расчёты, хелперы |
| Edge Functions | `atoms-cloud/edge-functions/*` | Все ИИ-функции |

**Что меняется при миграции Demo → Production:**
- `lib/atoms-cloud.ts` → адаптация под серверный контекст Next.js
- `lib/storage.ts` → Atoms Cloud Storage → Yandex Object Storage
- Добавляется `lib/prisma.ts` (ORM)
- Добавляется `lib/yookassa.ts` (платежи)
- Добавляется `middleware.ts` (JWT проверка)
- Страницы из `pages/*` → `app/*/page.tsx` (App Router)