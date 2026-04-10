# NutryAI Memory Bank

## Alembic Миграции

### ✅ Правила создания миграций

1. **Всегда проверяй heads перед созданием новой миграции:**
   ```bash
   cd my-app/app/backend
   python -c "from alembic.config import Config; from alembic.script import ScriptDirectory; cfg = Config('alembic.ini'); script = ScriptDirectory.from_config(cfg); print('Heads:', script.get_heads())"
   ```

2. **Правильно указывай `down_revision`:**
   - Используй **последний** head из списка
   - НЕ используй `a3b4c5d6e7f8` если есть другие миграции после него
   - Пример: `down_revision = "b1c2d3e4f5a6"` (последний head)

3. **Один head = одна ветка миграций:**
   - Если видишь `Multiple head revisions` — нужно исправить `down_revision`
   - Все миграции должны выстраиваться в одну цепочку

### ✅ Правила SQLAlchemy моделей

1. **`__table_args__` — только кортеж или None:**
   ```python
   # ❌ НЕПРАВИЛЬНО:
   __table_args__ = (
       {"extend_existing": True},  # dict нельзя!
       Index("ix_...", "user_id"),
   )

   # ✅ ПРАВИЛЬНО:
   __table_args__ = (
       Index("ix_...", "user_id"),
   )
   ```

2. **Для extend_existing используй `__mapper_args__`:**
   ```python
   __mapper_args__ = {"confirm_deleted_rows": False}
   ```

3. **Индексы добавляй через `Index`:**
   ```python
   from sqlalchemy import Index
   
   __table_args__ = (
       Index("ix_table_user_id", "user_id"),
       Index("ix_table_logged_at", "logged_at"),
       Index("ix_table_user_id_logged_at", "user_id", "logged_at"),  # составной
   )
   ```

### ✅ Типовые индексы для таблиц

| Таблица | Индексы |
|---------|---------|
| water_logs | user_id, logged_at, (user_id, logged_at) |
| meal_logs | user_id, logged_at, (user_id, logged_at) |
| weight_logs | user_id, logged_at |
| user_profiles | user_id |
| recipes | user_id |
| meal_plans | user_id |

### ✅ Структура миграции Alembic

```python
"""add user_id and logged_at indexes

Revision ID: xxxxxxxx
Revises: yyyyyyyy
Create Date: 2026-03-29

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "xxxxxxxx"
down_revision: Union[str, Sequence[str], None] = "yyyyyyyy"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    
    # Проверяй существование таблицы и индексов
    if insp.has_table("table_name"):
        existing_indexes = {idx["name"] for idx in insp.get_indexes("table_name")}
        
        if "ix_table_name_column" not in existing_indexes:
            op.create_index("ix_table_name_column", "table_name", ["column"])


def downgrade() -> None:
    op.drop_index("ix_table_name_column", table_name="table_name")
```

---

## PostgreSQL Пул соединений

### Текущая конфигурация (database.py)

```python
# Non-Lambda (VM):
engine_kwargs = {
    "pool_pre_ping": True,   # Проверка живых соединений
    "pool_size": 10,         # Базовое количество соединений
    "max_overflow": 20,      # Максимум пиковых соединений (всего 30)
    "pool_recycle": 3600,    # Пересоздание соединений каждый час
    "pool_timeout": 30,      # Ожидание соединения 30 сек
}

# Lambda:
engine_kwargs = {
    "poolclass": NullPool,   # Без пула — новое соединение каждый раз
}
```

---

## Деплой на VM

### Команда
```bash
sudo env APP_ROOT=/home/nutriaidiary/nutriaidiary-src/app bash /home/nutriaidiary/nutriaidiary-src/app/scripts/vm_deploy_pull.sh
```

###流程
1. git pull → 2. alembic upgrade head → 3. npm build → 4. restart systemd

---

## Частые ошибки

| Ошибка | Решение |
|--------|---------|
| `Multiple head revisions` | Проверь heads, исправь `down_revision` |
| `'dict' object has no attribute '_set_parent_with_dispatch'` | Убери dict из `__table_args__` |
| `AttributeError: 'Column' object has no attribute '_set_parent_with_dispatch'` | Используй `Index()` для индексов |

---

## Фича: Мои продукты (products + user_products)

### Архитектура
| Таблица | Назначение |
|---------|-----------|
| `products` | Глобальный кеш штрихкодов (shared, не привязан к юзеру) |
| `user_products` | Коллекция пользователя: FK → products + кастомные поля |

### Цепочка поиска штрихкода (scan endpoint)
```
POST /api/v1/scan
  → 1. Локальный кеш (таблица products)   ← мгновенно
  → 2. OpenFoodFacts API                   ← международные товары
  → 3. FatSecret API                       ← fallback, лучше для РФ
  → 4. 404 → фронт открывает форму ручного ввода со штрихкодом
```

### FatSecret — настройка
Зарегистрироваться на platform.fatsecret.com, добавить в `.env` на VM:
```
FATSECRET_CLIENT_ID=...
FATSECRET_CLIENT_SECRET=...
```
Без этих переменных FatSecret просто пропускается — ничего не ломается.

### Важные паттерны
- `source_api` в таблице `products`: `"openfoodfacts"` | `"fatsecret"` | `"manual"`
- `upsert_from_off()` — алиас, делегирует в `upsert_from_external()` (обратная совместимость)
- При 404 от scan: фронт автоматически открывает `AddProductModal` с предзаполненным штрихкодом
- Российские PLU-коды (4-5 цифр на весовых товарах) не будут найдены ни в одной базе

### Сканер штрихкодов (фронтенд)
- Библиотека: `@zxing/browser` + `@zxing/library` (заменили html5-qrcode — плохо читал EAN-13)
- `BrowserMultiFormatReader` с hints: `TRY_HARDER`, форматы EAN-13/EAN-8/UPC-A/UPC-E/CODE-128
- iOS: viewport должен быть видимым ДО инициализации ZXing → используем двухшаговый паттерн `setCameraActive(true)` → `useEffect` → `reader.start()`
- На цилиндрических банках камера читает хуже — рекомендуется ручной ввод

### Endpoint для AI интеграции
```
GET /api/v1/entities/user_products/for-ai
→ Возвращает список продуктов пользователя для системного промпта
→ Используется в /meal-plan при включённом чекбоксе "Учитывать мои продукты"
```

---

## Частые ошибки npm / деплой

| Ошибка | Решение |
|--------|---------|
| `npm ci` — lock file out of sync | Запустить `npm install --package-lock-only` локально, закоммитить `package-lock.json` |
| `git pull` — local changes would be overwritten | `git checkout <file>` на VM, затем деплой |
| `NotFoundException not exported from @zxing/browser` | Импортировать из `@zxing/library` |
| Backend "НЕ ОТВЕЧАЕТ" в скрипте деплоя | Race condition — бэкенд стартует ~10 сек, проверить вручную: `curl http://127.0.0.1:8000/health` |

---

## Git Workflow

1. Создай ветку: `git checkout -b feature/xxx`
2. Запушь: `git push -u origin feature/xxx`
3. MR в main
4. На VM: `git pull` (автоматически через deploy script)

### Репозиторий
- Git находится в `c:\Users\kobel\NutryAI\my-app` (не в корне `NutryAI`)
- Remote: `github.com:PavelKobe/NutryAI.git`