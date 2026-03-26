#!/bin/bash
# =============================================================================
# Подготовка VM (Ubuntu) на Yandex Cloud для Nutriaidiary
# Стек: Nginx (TLS) -> Next.js :3000, FastAPI :8000
# Код: репозиторий с каталогом app/ (backend + web), см. DEPLOY_YC.md
#
# Сеть Yandex: дефолтная VPC ок; в Security Group откройте 22, 80, 443 (как UFW).
# Альтернатива без venv: Docker — установите INSTALL_DOCKER=1 и деплой через docker compose.
# =============================================================================

set -euo pipefail

# --- Настройте под себя (или экспортируйте переменные до запуска) ---
: "${NEW_USER:=nutriaidiary}"
: "${NEW_USER_PASSWORD:=}" # задайте до запуска: export NEW_USER_PASSWORD='...'
: "${DOMAIN:=nutriaidiary.com}"
: "${API_DOMAIN:=api.nutriaidiary.com}"
# Админка Next.js (те же :3000, что основной сайт). Должна быть в DNS и в CORS бэкенда — см. main.py _cors_origins
: "${ADMIN_DOMAIN:=admin.nutriaidiary.com}"
: "${APP_ROOT:=/var/www/nutriaidiary/app}" # сюда кладите клон с путями app/backend и app/web

# Локальный PostgreSQL на VM (0 = пропустить, используйте Yandex Managed + DATABASE_URL в .env)
: "${INSTALL_LOCAL_POSTGRES:=1}"

# Docker + Compose plugin (опционально, вместо systemd+venv)
: "${INSTALL_DOCKER:=0}"

# Node.js major (22 как в docker/Dockerfile.web)
: "${NODE_MAJOR:=22}"

echo "=========================================="
echo "Настройка VM для Nutriaidiary (Yandex Cloud)"
echo "=========================================="
echo "Пользователь: $NEW_USER"
echo "Фронт: https://$DOMAIN (+ www)"
echo "Админка: https://$ADMIN_DOMAIN -> Next :3000"
echo "API: https://$API_DOMAIN"
echo "Корень приложения: $APP_ROOT"
echo "Локальный PostgreSQL: $INSTALL_LOCAL_POSTGRES"
echo "Установить Docker: $INSTALL_DOCKER"
echo "=========================================="

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Запустите от root: sudo bash $0"
  exit 1
fi

if [[ -z "${NEW_USER_PASSWORD}" ]]; then
  echo "Ошибка: задайте NEW_USER_PASSWORD (временный пароль для $NEW_USER)."
  echo "Пример: export NEW_USER_PASSWORD='...' && sudo -E bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

# -----------------------------------------------------------------------------
# 1. Система
# -----------------------------------------------------------------------------
echo ""
echo "[1/10] Обновление пакетов..."
apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends \
  software-properties-common curl wget git ca-certificates gnupg ufw locales

# -----------------------------------------------------------------------------
# 2. Пользователь приложения
# -----------------------------------------------------------------------------
echo ""
echo "[2/10] Пользователь $NEW_USER..."
if id "$NEW_USER" &>/dev/null; then
  echo "Пользователь уже существует, пропуск создания."
else
  useradd -m -s /bin/bash "$NEW_USER"
  echo "${NEW_USER}:${NEW_USER_PASSWORD}" | chpasswd
  usermod -aG sudo "$NEW_USER"
  echo "$NEW_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/${NEW_USER}"
  chmod 440 "/etc/sudoers.d/${NEW_USER}"
fi

install -d -m 755 -o "$NEW_USER" -g "$NEW_USER" "/home/${NEW_USER}/apps" "/home/${NEW_USER}/logs" "/home/${NEW_USER}/backups"
install -d -m 755 -o "$NEW_USER" -g "$NEW_USER" /var/www/nutriaidiary

if [[ -d /root/.ssh ]]; then
  cp -r /root/.ssh "/home/${NEW_USER}/.ssh" 2>/dev/null || true
  chown -R "${NEW_USER}:${NEW_USER}" "/home/${NEW_USER}/.ssh" 2>/dev/null || true
  chmod 700 "/home/${NEW_USER}/.ssh" 2>/dev/null || true
  chmod 600 "/home/${NEW_USER}/.ssh/authorized_keys" 2>/dev/null || true
fi

# -----------------------------------------------------------------------------
# 3. Node.js (Next.js)
# -----------------------------------------------------------------------------
echo ""
echo "[3/10] Node.js ${NODE_MAJOR}.x..."
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
apt-get install -y nodejs
node --version
npm --version

# -----------------------------------------------------------------------------
# 4. Python (FastAPI, venv в $APP_ROOT/backend)
# -----------------------------------------------------------------------------
echo ""
echo "[4/10] Python 3..."
apt-get install -y python3 python3-pip python3-venv python3-dev build-essential libpq-dev
ln -sf /usr/bin/python3 /usr/bin/python

# -----------------------------------------------------------------------------
# 5. PostgreSQL (опционально)
# -----------------------------------------------------------------------------
if [[ "$INSTALL_LOCAL_POSTGRES" == "1" ]]; then
  echo ""
  echo "[5/10] Локальный PostgreSQL..."
  apt-get install -y postgresql postgresql-contrib
  systemctl enable --now postgresql

  DB_NAME="nutriaidiary"
  DB_USER="nutriaidiary_user"
  DB_PASS="${NUTRI_DB_PASSWORD:-$(openssl rand -base64 24)}"

  sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOF
CREATE DATABASE ${DB_NAME};
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
ALTER ROLE ${DB_USER} SET client_encoding TO 'utf8';
ALTER ROLE ${DB_USER} SET default_transaction_isolation TO 'read committed';
ALTER ROLE ${DB_USER} SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
EOF

  echo ""
  echo ">>> Локальный DATABASE_URL (добавьте в ${APP_ROOT}/.env):"
  echo "DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"
  echo ""
else
  echo ""
  echo "[5/10] PostgreSQL пропущен — укажите Yandex Managed в DATABASE_URL (.env)."
fi

# -----------------------------------------------------------------------------
# 6. Docker (опционально)
# -----------------------------------------------------------------------------
if [[ "$INSTALL_DOCKER" == "1" ]]; then
  echo ""
  echo "[6/10] Docker..."
  apt-get install -y docker.io docker-compose-v2
  usermod -aG docker "$NEW_USER"
  systemctl enable --now docker
  docker --version
else
  echo ""
  echo "[6/10] Docker не устанавливаем (INSTALL_DOCKER=0)."
fi

# -----------------------------------------------------------------------------
# 7. Nginx — только HTTP до certbot (иначе редирект на HTTPS без сертификатов ломает запуск)
# -----------------------------------------------------------------------------
echo ""
echo "[7/10] Nginx (порт 80, прокси на Next :3000 и API :8000)..."

apt-get install -y nginx

install -d -m 755 /var/www/html

# Минимальный nginx.conf (без полной перезаписи дефолта Ubuntu — только sites)
if [[ -f /etc/nginx/nginx.conf ]] && ! grep -q 'sites-enabled' /etc/nginx/nginx.conf; then
  echo "Проверьте, что в nginx.conf есть include sites-enabled/*"
fi

cat > /etc/nginx/sites-available/nutriaidiary <<NGX
# Этап 1: только HTTP. После прописанного DNS:
#   sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d ${ADMIN_DOMAIN} -d ${API_DOMAIN}

# Фронт Next.js (nutriaidiary.com + www)
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    access_log /var/log/nginx/nutriaidiary-web-access.log;
    error_log  /var/log/nginx/nutriaidiary-web-error.log;
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}

# Админ-панель (Next.js на том же порту, что основной сайт)
server {
    listen 80;
    server_name ${ADMIN_DOMAIN};
    access_log /var/log/nginx/nutriaidiary-admin-access.log;
    error_log  /var/log/nginx/nutriaidiary-admin-error.log;
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}

# API FastAPI
# CORS (Access-Control-* и ответы на OPTIONS / preflight) отдаёт приложение (FastAPI CORSMiddleware в main.py).
# В _cors_origins уже есть https://${ADMIN_DOMAIN} — запросы с админки на ${API_DOMAIN} (/api/v1/admin/* и др.) валидны.
# Nginx только проксирует; не добавляйте здесь add_header Access-Control-* — иначе дублирование заголовков в ответе.
server {
    listen 80;
    server_name ${API_DOMAIN};
    access_log /var/log/nginx/nutriaidiary-api-access.log;
    error_log  /var/log/nginx/nutriaidiary-api-error.log;
    client_max_body_size 25m;
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        # Проброс preflight и прочих методов на uvicorn (нужно для CORS из браузера)
        proxy_set_header Origin \$http_origin;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
NGX

ln -sf /etc/nginx/sites-available/nutriaidiary /etc/nginx/sites-enabled/nutriaidiary
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable --now nginx

# -----------------------------------------------------------------------------
# 8. Certbot
# -----------------------------------------------------------------------------
echo ""
echo "[8/10] Certbot..."
apt-get install -y certbot python3-certbot-nginx

# -----------------------------------------------------------------------------
# 9. UFW
# -----------------------------------------------------------------------------
echo ""
echo "[9/10] UFW (22, 80, 443)..."
ufw --force reset
ufw allow OpenSSH
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
ufw status verbose

# -----------------------------------------------------------------------------
# 10. systemd: FastAPI + Next (после того как код лежит в $APP_ROOT)
# -----------------------------------------------------------------------------
echo ""
echo "[10/10] Unit-файлы systemd..."

cat > /etc/systemd/system/nutriaidiary-api.service <<EOF
[Unit]
Description=Nutriaidiary FastAPI (uvicorn)
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=${NEW_USER}
Group=${NEW_USER}
WorkingDirectory=${APP_ROOT}/backend
EnvironmentFile=-${APP_ROOT}/.env
Environment=PATH=${APP_ROOT}/backend/venv/bin:/usr/local/bin:/usr/bin
ExecStart=${APP_ROOT}/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

# Логи
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/nutriaidiary-web.service <<EOF
[Unit]
Description=Nutriaidiary Next.js
After=network.target

[Service]
Type=simple
User=${NEW_USER}
Group=${NEW_USER}
WorkingDirectory=${APP_ROOT}/web
EnvironmentFile=-${APP_ROOT}/web/.env.production
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
Environment=INTERNAL_API_BASE_URL=http://127.0.0.1:8000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
# Не включаем автозапуск, пока нет venv и build — включите вручную:
# sudo systemctl enable --now nutriaidiary-api nutriaidiary-web

# -----------------------------------------------------------------------------
# Прочее
# -----------------------------------------------------------------------------
timedatectl set-timezone Europe/Moscow || true
locale-gen ru_RU.UTF-8 || true
update-locale LANG=ru_RU.UTF-8 LC_ALL=ru_RU.UTF-8 2>/dev/null || true

if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo ""
echo "=========================================="
echo "Готово."
echo "=========================================="
echo ""
echo "Дальше (под пользователем ${NEW_USER} или через sudo -u):"
echo ""
echo "1) Клонировать репозиторий так, чтобы backend и web были здесь:"
echo "   ${APP_ROOT}/backend   (main.py, requirements.txt)"
echo "   ${APP_ROOT}/web       (Next.js)"
echo ""
echo "2) Бэкенд:"
echo "   cd ${APP_ROOT}/backend && python3 -m venv venv && . venv/bin/activate"
echo "   pip install -r requirements.txt"
echo "   скопировать ${APP_ROOT}/.env из .env.example и заполнить секреты"
echo "   alembic upgrade head"
echo ""
echo "3) Фронт:"
echo "   cd ${APP_ROOT}/web && npm ci && npm run build"
echo "   опционально: echo 'NEXT_PUBLIC_API_BASE_URL=https://${API_DOMAIN}' > .env.production"
echo "   echo 'NEXT_PUBLIC_SITE_URL=https://${DOMAIN}' >> .env.production"
echo ""
echo "4) Запуск:"
echo "   sudo systemctl enable --now nutriaidiary-api nutriaidiary-web"
echo ""
echo "5) TLS (DNS A/AAAA на эту VM уже должны быть, в т.ч. для admin):"
echo "   sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d ${ADMIN_DOMAIN} -d ${API_DOMAIN}"
echo ""
echo "6) Docker-вариант: INSTALL_DOCKER=1 при повторном прогоне или вручную:"
echo "   cd ${APP_ROOT} && docker compose up -d"
echo "   (тогда systemd-сервисы не используйте одновременно с контейнерами на тех же портах)"
echo ""
echo "Yandex Cloud: в группе безопасности ВМ откройте те же порты, что и в UFW."
echo "=========================================="
