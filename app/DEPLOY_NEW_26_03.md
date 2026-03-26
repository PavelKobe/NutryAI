# Деплой обновлений на VM (26.03) — код, nginx, TLS

Инструкция для ситуации: на ВМ старая версия лендинга, нет маршрутов админ-API (`/api/v1/admin/*`), обновление кода делается скриптом `vm_deploy_pull.sh`. Ниже — пошагово: SSH, выкладка приложения, правка nginx по шаблону из репозитория, обновление сертификата Let’s Encrypt.

Пути в примере (подставь свои, если отличаются):

- Репозиторий на ВМ: `/home/nutriaidiary/nutriaidiary-src`
- `APP_ROOT`: `/home/nutriaidiary/nutriaidiary-src/app`
- Пользователь: `nutriaidiary`
- Шаблон nginx в репо: `nginx.conf.example` в **корне** репозитория (рядом с каталогом `app/`)

---

## 1. Подключись к VM по SSH

```bash
ssh nutriaidiary@<IP_ВМ>
```

(или `ssh -i ~/.ssh/ключ user@host` — как у тебя настроено.)

---

## 2. Резервные копии (рекомендуется)

```bash
sudo cp /etc/nginx/sites-available/nutriaidiary /etc/nginx/sites-available/nutriaidiary.bak.$(date +%Y%m%d)
```

При необходимости сохрани копию `app/.env` вне репозитория (секреты не коммитить).

---

## 3. Подтянуть код с GitHub и пересобрать приложение

Из-под пользователя, который владеет `.git` (часто тот же `nutriaidiary`), или через `sudo` как в команде ниже:

```bash
sudo env APP_ROOT=/home/nutriaidiary/nutriaidiary-src/app \
  bash /home/nutriaidiary/nutriaidiary-src/app/scripts/vm_deploy_pull.sh
```

Скрипт выполнит `git pull`, затем `vm_install_app.sh`: venv, `alembic upgrade head`, `npm ci && npm run build`, перезапуск `nutriaidiary-api` и `nutriaidiary-web`.

Проверка локально на ВМ:

```bash
curl -sS http://127.0.0.1:8000/health
curl -sS http://127.0.0.1:8000/openapi.json | head -c 2000 | grep -o 'admin' | head -1
# или: curl -sS http://127.0.0.1:8000/openapi.json | grep -E 'admin|/api/v1/admin'
```

Админ-роуты в API имеют префикс **`/api/v1/admin/...`** (например `/api/v1/admin/users`), а не `/api/admin`.

---

## 4. Сверить и обновить nginx по шаблону

Шаблон в репозитории (после pull):

```text
/home/nutriaidiary/nutriaidiary-src/nginx.conf.example
```

Он описывает **три** `server`:

1. `nutriaidiary.com` и `www` → прокси на `127.0.0.1:3000` (Next).
2. **`admin.nutriaidiary.com`** → тот же `127.0.0.1:3000` (админка Next, пути `/admin/...`).
3. `api.nutriaidiary.com` → `127.0.0.1:8000` (FastAPI), с `proxy_set_header Origin $http_origin` и **без** лишних `add_header Access-Control-*` (CORS задаёт бэкенд в `main.py`).

Открой текущий конфиг на ВМ:

```bash
sudo nano /etc/nginx/sites-available/nutriaidiary
# или: sudo vim /etc/nginx/sites-available/nutriaidiary
```

**Важно:** если certbot уже выдавал HTTPS, в файле уже есть блоки с `listen 443 ssl` и строки `ssl_certificate` — **не удаляй их**. Действуй так:

- Сравни файл с `nginx.conf.example` (в другом терминале: `less ~/nutriaidiary-src/nginx.conf.example`).
- Если **нет** отдельного `server` для `admin.nutriaidiary.com` — **добавь** такой блок по шаблону из `nginx.conf.example` (для порта 80; certbot потом допишет зеркало для 443).
- Для **api**-блока убедись, что в `location /` есть `proxy_set_header Origin $http_origin;` как в шаблоне.
- Имена доменов в `server_name` при необходимости замени на свои (если не `nutriaidiary.com`).

Проверка синтаксиса и перезагрузка:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 5. DNS

Запись **A** (и при необходимости **AAAA**) для:

- `nutriaidiary.com`, `www.nutriaidiary.com`
- **`admin.nutriaidiary.com`**
- `api.nutriaidiary.com`

должна указывать на эту ВМ (или на балансировщик, который ведёт на неё).

---

## 6. Обновление сертификата Let’s Encrypt (добавить `admin`)

Если сертификат выдавался **без** `admin.nutriaidiary.com`, расширь его:

```bash
sudo certbot --nginx \
  -d nutriaidiary.com \
  -d www.nutriaidiary.com \
  -d admin.nutriaidiary.com \
  -d api.nutriaidiary.com
```

Certbot может предложить **expand** существующего сертификата — согласись, если список доменов совпадает с нужным. После успеха снова:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. Переменные окружения (бэкенд и CORS)

Файл **`/home/nutriaidiary/nutriaidiary-src/app/.env`** (см. подробно [`DEPLOY_YC.md`](DEPLOY_YC.md), раздел 4):

- `ENVIRONMENT=prod`
- `PYTHON_BACKEND_URL=https://api.nutriaidiary.com`
- `FRONTEND_URL=https://nutriaidiary.com`
- при необходимости `CORS_EXTRA_ORIGINS=...` (доп. origin’ы через запятую)

В `main.py` уже учтён origin **`https://admin.nutriaidiary.com`** для запросов админки к API.

После правок `.env`:

```bash
sudo systemctl restart nutriaidiary-api
```

---

## 8. Фронт (новый лендинг)

Убедись, что для production-сборки заданы (часто в `app/web/.env.production` или в unit systemd):

```env
NEXT_PUBLIC_API_BASE_URL=https://api.nutriaidiary.com
NEXT_PUBLIC_SITE_URL=https://nutriaidiary.com
```

После изменения — снова `npm run build` в `app/web` (уже делает `vm_install_app.sh` при деплое) и:

```bash
sudo systemctl restart nutriaidiary-web
```

Снаружи проверь главную в режиме инкогнито или с обходом кэша (Ctrl+F5), чтобы увидеть новый лендинг.

---

## 9. Итоговая проверка снаружи

```bash
curl -sI https://nutriaidiary.com | head -n5
curl -sI https://admin.nutriaidiary.com | head -n5
curl -sS https://api.nutriaidiary.com/health
```

В браузере: открытие `/docs` на API, проверка наличия путей `/api/v1/admin/...`; вход в админку с `https://admin.nutriaidiary.com` (или с основного домена, если так настроено).

---

## Краткий чеклист

| Шаг | Действие |
|-----|----------|
| 1 | SSH на ВМ |
| 2 | Бэкап `sites-available/nutriaidiary` |
| 3 | `sudo env APP_ROOT=... bash .../vm_deploy_pull.sh` |
| 4 | Влить в nginx недостающие `server` / правки из `nginx.conf.example`, `nginx -t`, `reload` |
| 5 | DNS для `admin` |
| 6 | `certbot --nginx` со всеми четырьмя `-d` |
| 7 | `.env` бэкенда, `restart nutriaidiary-api` |
| 8 | `NEXT_PUBLIC_*`, при необходимости `restart nutriaidiary-web` |
| 9 | Проверки curl и браузер |

При расхождении путей с твоей ВМ замени `/home/nutriaidiary/nutriaidiary-src` и `APP_ROOT` на фактические из `pwd` и `git rev-parse --show-toplevel`.
