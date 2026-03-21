# VM после пуша на GitHub: пошагово для новичка

Цель: с ВМ открываются сайт `https://nutriaidiary.com` и API `https://api.nutriaidiary.com`, приложение крутится локально на портах **3000** (Next) и **8000** (FastAPI), снаружи — только **Nginx** на **80/443**.

Пути в скриптах и в `vm_bootstrap_yandex.sh` рассчитаны на:

- **`APP_ROOT=/var/www/nutriaidiary/app`** → внутри должны лежать каталоги **`backend`** и **`web`** (как в репозитории: `NutryAI/app/backend`, `NutryAI/app/web`).

---

## Этап A. Облако Yandex (файрвол до SSH)

Сделайте **до** или **сразу после** создания ВМ:

1. **Группа безопасности** (Security Group), привязанная к ВМ:
   - **Входящие:** TCP **22** (SSH — лучше ограничить своим IP / офисной подсетью), **80**, **443**.
   - **Исходящие:** по умолчанию «всё» (нужно для apt, GitHub, Let’s Encrypt, OpenRouter, Google OAuth).

2. Запомните **публичный IP** ВМ — его укажете в DNS.

Без открытых **80/443** Nginx снаружи не достучаться; без **22** не зайдёте по SSH.

---

## Этап B. Первичная подготовка ВМ (один раз)

На чистой Ubuntu от **root** выполните bootstrap из репозитория (или скопируйте скрипт на ВМ):

```bash
export NEW_USER_PASSWORD='сложный-временный-пароль'
# Только Managed PostgreSQL в облаке, без локального Postgres на ВМ:
# export INSTALL_LOCAL_POSTGRES=0
sudo -E bash /путь/к/vm_bootstrap_yandex.sh
```

Bootstrap уже настраивает:

- **UFW** на ВМ: 22, 80, 443 (это **отдельно** от Security Group в YC — нужны **оба**).
- **Nginx**: прокси на `127.0.0.1:3000` и `127.0.0.1:8000`, сначала только HTTP (для Certbot).
- **Certbot**, **Node**, **Python**, unit-файлы **systemd** `nutriaidiary-api` / `nutriaidiary-web`.
- Пользователя **`nutriaidiary`** (или имя из `NEW_USER`).

Если bootstrap **уже** запускали — этап B пропускаете.

---

## Этап C. SSH-ключ и GitHub

1. Подключитесь: `ssh nutriaidiary@<IP_ВМ>` (или `root`, потом перейдите на `nutriaidiary`).
2. На ВМ сгенерируйте ключ (если пусто):

   ```bash
   ssh-keygen -t ed25519 -C "vm-nutriaidiary" -f ~/.ssh/id_ed25519 -N ""
   cat ~/.ssh/id_ed25519.pub
   ```

3. В GitHub: **Settings → SSH and GPG keys → New SSH key** — вставьте содержимое `.pub`.
4. Проверка: `ssh -T git@github.com` (должно приветствовать пользователя).

---

## Этап D. Клонирование репозитория и ссылка `APP_ROOT`

Репозиторий на GitHub: код приложения в каталоге **`app/`** (внутри — `backend`, `web`). Скрипт кладёт клон в `/var/www/nutriaidiary/nutriaidiary-repo` и создаёт symlink:

`/var/www/nutriaidiary/app` → `.../nutriaidiary-repo/app`

**Важно:** до первого клона на ВМ пути `/var/www/nutriaidiary/app/...` ещё нет. Выберите один способ.

### D1. Скопировать скрипт с компьютера (удобно для новичка)

На **Windows (PowerShell)** с машины, где есть репозиторий:

```powershell
scp "C:\Users\kobel\nutry-project\NutryAI\app\scripts\vm_clone_from_github.sh" nutriaidiary@<IP_ВМ>:/tmp/
```

На ВМ:

```bash
sudo bash /tmp/vm_clone_from_github.sh
```

### D2. Уже есть клон в домашнем каталоге

```bash
cd ~
git clone git@github.com:PavelKobe/NutryAI.git nutriaidiary-src
sudo REPO_DIR="$HOME/nutriaidiary-src" bash "$HOME/nutriaidiary-src/app/scripts/vm_clone_from_github.sh"
```

Скрипт не будет клонировать второй раз, только создаст symlink `APP_ROOT`.

### Переменные (опционально)

По умолчанию: `REPO_URL=git@github.com:PavelKobe/NutryAI.git`, `DEPLOY_USER=nutriaidiary`.

Свой репозиторий:

```bash
sudo REPO_URL='git@github.com:YOU/REPO.git' DEPLOY_USER=nutriaidiary bash /tmp/vm_clone_from_github.sh
```

Подробности — в комментариях в начале `scripts/vm_clone_from_github.sh`.

---

## Этап E. Переменные окружения

1. **Бэкенд** — файл **`/var/www/nutriaidiary/app/.env`** (не коммитится в git):

   ```bash
   cp /var/www/nutriaidiary/app/.env.example /var/www/nutriaidiary/app/.env
   nano /var/www/nutriaidiary/app/.env
   ```

   Заполните `DATABASE_URL`, секреты JWT/OIDC, OpenRouter, URL фронта и API (см. `DEPLOY_YC.md`).

2. **Фронт (Next)** — для systemd используется **`/var/www/nutriaidiary/app/web/.env.production`**:

   ```bash
   nano /var/www/nutriaidiary/app/web/.env.production
   ```

   Минимум:

   ```env
   NEXT_PUBLIC_API_BASE_URL=https://api.nutriaidiary.com
   NEXT_PUBLIC_SITE_URL=https://nutriaidiary.com
   ```

   После изменения `.env.production` снова выполните **`npm run build`** в `web` (или шаг из этапа F).

---

## Этап F. Зависимости, миграции, сборка, запуск

Один скрипт под пользователя приложения (ставит venv, `pip`, `alembic`, `npm ci`, `build`, включает systemd):

```bash
sudo -u nutriaidiary bash /var/www/nutriaidiary/app/scripts/vm_install_app.sh
```

Либо вручную (как в конце `vm_bootstrap_yandex.sh`): venv в `backend`, `alembic upgrade head`, `npm ci && npm run build` в `web`, затем:

```bash
sudo systemctl enable --now nutriaidiary-api nutriaidiary-web
sudo systemctl status nutriaidiary-api nutriaidiary-web --no-pager
```

Проверка локально на ВМ:

```bash
curl -sS http://127.0.0.1:8000/health
curl -sI http://127.0.0.1:3000 | head -n1
```

---

## Этап G. DNS

У регистратора домена:

- **A** (и при необходимости **AAAA**) для `nutriaidiary.com`, `www`, `api` → IP ВМ.

Пока DNS не указывает на ВМ, Certbot для этих имён не выпустит сертификат.

---

## Этап H. HTTPS (Let’s Encrypt)

Когда **A-записи** уже видны с интернета:

```bash
sudo certbot --nginx -d nutriaidiary.com -d www.nutriaidiary.com -d api.nutriaidiary.com
```

Certbot сам допишет `listen 443 ssl` в ваш site-конфиг Nginx. Затем:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Этап I. Финальная проверка

- `https://api.nutriaidiary.com/health`
- Открытие главной, вход через Google
- Подробный чеклист — в `DEPLOY_YC.md`, раздел «Проверка».

---

## Вместо systemd: Docker

Из каталога **`/var/www/nutriaidiary/app`** (где `docker-compose.yml`):

```bash
docker compose build && docker compose up -d
```

**Не** запускайте одновременно контейнеры на **3000/8000** и те же порты через systemd — будет конфликт.

---

## Краткая шпаргалка «что за что отвечает»

| Что | Где |
|-----|-----|
| Файрвол **облака** | Security Group Yandex (вход 22, 80, 443) |
| Файрвол **на ВМ** | UFW (настраивает bootstrap) |
| Прокси и TLS | Nginx + Certbot |
| Процессы приложения | systemd `nutriaidiary-api`, `nutriaidiary-web` или Docker |

---

## Скрипты в репозитории

| Файл | Назначение |
|------|------------|
| `scripts/vm_bootstrap_yandex.sh` | Первая настройка ВМ: пакеты, UFW, Nginx, Certbot, systemd units |
| `scripts/vm_clone_from_github.sh` | Клон + symlink на `APP_ROOT` |
| `scripts/vm_install_app.sh` | venv, alembic, npm build, enable сервисов |

После `git pull` на ВМ можно снова запускать `vm_install_app.sh` для обновления зависимостей и пересборки (ветку/тег выбирайте сами через `git` в каталоге клона).
