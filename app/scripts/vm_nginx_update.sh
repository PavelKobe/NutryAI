#!/bin/bash
# =============================================================================
# Обновление nginx-конфига для Nutriaidiary.
#
# Что делает:
#   1. Добавляет rate-limiting зоны в /etc/nginx/conf.d/nutriaidiary-rate-limits.conf
#   2. Перезаписывает /etc/nginx/sites-available/nutriaidiary:
#      - Разделяет location / на /api/v1/auth/, /api/v1/, /  (API-блок)
#      - Активирует rate limiting для auth и api эндпоинтов
#      - Сохраняет SSL-блоки, если certbot уже выпустил сертификаты
#   3. Создаёт резервную копию текущего конфига
#   4. Тестирует и перезагружает nginx
#
# Запуск (от root):
#   sudo bash /home/nutriaidiary/nutriaidiary-src/app/scripts/vm_nginx_update.sh
#
# Переменные (можно переопределить):
#   DOMAIN        — основной домен (default: nutriaidiary.com)
#   ADMIN_DOMAIN  — домен админки (default: admin.nutriaidiary.com)
#   API_DOMAIN    — домен API (default: api.nutriaidiary.com)
# =============================================================================
set -euo pipefail

: "${DOMAIN:=nutriaidiary.com}"
: "${ADMIN_DOMAIN:=admin.nutriaidiary.com}"
: "${API_DOMAIN:=api.nutriaidiary.com}"

NGINX_SITES_AVAILABLE="/etc/nginx/sites-available/nutriaidiary"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled/nutriaidiary"
NGINX_CONF_D="/etc/nginx/conf.d/nutriaidiary-rate-limits.conf"
BACKUP_DIR="/etc/nginx/backups"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

# ─── Проверки ────────────────────────────────────────────────────────────────
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Ошибка: запустите от root (sudo bash $0)"
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "Ошибка: nginx не найден. Сначала установите: apt-get install -y nginx"
  exit 1
fi

# ─── Резервная копия ──────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if [[ -f "$NGINX_SITES_AVAILABLE" ]]; then
  cp "$NGINX_SITES_AVAILABLE" "${BACKUP_DIR}/nutriaidiary_${TIMESTAMP}.conf"
  echo "Резервная копия: ${BACKUP_DIR}/nutriaidiary_${TIMESTAMP}.conf"
fi

# ─── Определяем: есть SSL-сертификаты? ───────────────────────────────────────
SSL_CERT="${CERT_DIR}/fullchain.pem"
SSL_KEY="${CERT_DIR}/privkey.pem"
SSL_OPTIONS="/etc/letsencrypt/options-ssl-nginx.conf"
SSL_DHPARAMS="/etc/letsencrypt/ssl-dhparams.pem"

HAS_SSL=0
if [[ -f "$SSL_CERT" && -f "$SSL_KEY" ]]; then
  HAS_SSL=1
  echo "SSL-сертификаты найдены в $CERT_DIR — пишем конфиг с HTTPS."
else
  echo "SSL-сертификаты НЕ найдены — пишем конфиг только с HTTP."
  echo "Для выпуска: sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d ${ADMIN_DOMAIN} -d ${API_DOMAIN}"
fi

# ─── Шаг 1: rate-limiting зоны в conf.d ──────────────────────────────────────
echo ""
echo "[1/3] Запись rate-limiting зон в ${NGINX_CONF_D}..."

cat > "$NGINX_CONF_D" <<'EOF'
# Rate limiting для Nutriaidiary.
# Файл создан vm_nginx_update.sh — не редактируйте вручную.
#
# auth_limit  — строгий лимит для /api/v1/auth/* (защита от brute-force)
# api_limit   — мягкий лимит для остальных API-эндпоинтов

limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api_limit:10m  rate=100r/m;

# Опционально: кастомный статус-код и страница для rate-limited ответов
limit_req_status 429;
EOF

echo "OK: ${NGINX_CONF_D}"

# ─── Шаг 2: пишем sites-available/nutriaidiary ───────────────────────────────
echo ""
echo "[2/3] Запись ${NGINX_SITES_AVAILABLE}..."

# ── Общие прокси-заголовки (для удобства) ──
PROXY_HEADERS_COMMON='        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;'

PROXY_HEADERS_WS='        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;'

# ─────────────────────────────────────────────────────────────────────────────
# Функции для генерации блоков

write_web_server_block() {
  local listen_directive="$1"
  local ssl_block="${2:-}"
  cat <<BLOCK
# ─── Фронт Next.js (${DOMAIN} + www) ─────────────────────────────────────────
server {
    ${listen_directive}
    server_name ${DOMAIN} www.${DOMAIN};
    access_log /var/log/nginx/nutriaidiary-web-access.log;
    error_log  /var/log/nginx/nutriaidiary-web-error.log;
${ssl_block}
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
${PROXY_HEADERS_WS}
        proxy_connect_timeout 60s;
        proxy_send_timeout    120s;
        proxy_read_timeout    120s;
    }
}
BLOCK
}

write_admin_server_block() {
  local listen_directive="$1"
  local ssl_block="${2:-}"
  cat <<BLOCK
# ─── Админ-панель (${ADMIN_DOMAIN}) ──────────────────────────────────────────
server {
    ${listen_directive}
    server_name ${ADMIN_DOMAIN};
    access_log /var/log/nginx/nutriaidiary-admin-access.log;
    error_log  /var/log/nginx/nutriaidiary-admin-error.log;
${ssl_block}
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
${PROXY_HEADERS_WS}
        proxy_connect_timeout 60s;
        proxy_send_timeout    120s;
        proxy_read_timeout    120s;
    }
}
BLOCK
}

write_api_server_block() {
  local listen_directive="$1"
  local ssl_block="${2:-}"
  cat <<BLOCK
# ─── API FastAPI (${API_DOMAIN}) ───────────────────────────────────────────────
# CORS отдаёт FastAPI (CORSMiddleware в main.py) — не дублировать add_header Access-Control-* здесь.
server {
    ${listen_directive}
    server_name ${API_DOMAIN};
    access_log /var/log/nginx/nutriaidiary-api-access.log;
    error_log  /var/log/nginx/nutriaidiary-api-error.log;
    client_max_body_size 25m;
${ssl_block}
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Auth-эндпоинты: строгий лимит — 10 req/min, burst=5 (защита brute-force)
    location /api/v1/auth/ {
        limit_req zone=auth_limit burst=5 nodelay;
        proxy_pass http://127.0.0.1:8000;
${PROXY_HEADERS_COMMON}
        proxy_set_header Origin \$http_origin;
        proxy_connect_timeout 300s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }

    # Остальные API-эндпоинты: мягкий лимит — 100 req/min, burst=20
    location /api/v1/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:8000;
${PROXY_HEADERS_COMMON}
        proxy_set_header Origin \$http_origin;
        proxy_connect_timeout 300s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }

    # Catchall: health check, корень — без rate limiting
    location / {
        proxy_pass http://127.0.0.1:8000;
${PROXY_HEADERS_COMMON}
        proxy_set_header Origin \$http_origin;
        proxy_connect_timeout 300s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }
}
BLOCK
}

# ─────────────────────────────────────────────────────────────────────────────

{
  echo "# Nutriaidiary nginx — сгенерировано vm_nginx_update.sh ${TIMESTAMP}"
  echo "# НЕ редактируйте вручную (certbot-блоки добавляются certbot'ом)."
  echo ""

  if [[ "$HAS_SSL" -eq 1 ]]; then

    SSL_PARAMS="    ssl_certificate     ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};"
    if [[ -f "$SSL_OPTIONS" ]]; then
      SSL_PARAMS="${SSL_PARAMS}
    include             ${SSL_OPTIONS};
    ssl_dhparam         ${SSL_DHPARAMS};"
    fi

    # HTTP → редирект на HTTPS
    cat <<REDIRECT
# ─── HTTP → HTTPS редиректы ───────────────────────────────────────────────────
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN} ${ADMIN_DOMAIN} ${API_DOMAIN};
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    location / {
        return 301 https://\$host\$request_uri;
    }
}
REDIRECT

    echo ""
    # HTTPS-блоки
    write_web_server_block  "listen 443 ssl;" "$SSL_PARAMS"
    echo ""
    write_admin_server_block "listen 443 ssl;" "$SSL_PARAMS"
    echo ""
    write_api_server_block  "listen 443 ssl;" "$SSL_PARAMS"

  else
    # Только HTTP
    write_web_server_block  "listen 80;"
    echo ""
    write_admin_server_block "listen 80;"
    echo ""
    write_api_server_block  "listen 80;"
  fi

} > "$NGINX_SITES_AVAILABLE"

# Убеждаемся, что сайт включён
ln -sf "$NGINX_SITES_AVAILABLE" "$NGINX_SITES_ENABLED"
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

echo "OK: ${NGINX_SITES_AVAILABLE}"

# ─── Шаг 3: тест и перезагрузка ──────────────────────────────────────────────
echo ""
echo "[3/3] Тест конфига и перезагрузка nginx..."
nginx -t
systemctl reload nginx

echo ""
echo "======================================================================"
echo "Готово! Rate limiting активирован:"
echo "  /api/v1/auth/*  → 10 req/min per IP  (burst=5)"
echo "  /api/v1/*       → 100 req/min per IP (burst=20)"
echo ""
echo "Проверка:"
echo "  curl -sS https://api.${DOMAIN}/health"
echo "  curl -sI https://${DOMAIN} | head -1"
echo ""
if [[ "$HAS_SSL" -eq 0 ]]; then
  echo "SSL не настроен. Выпустите сертификат:"
  echo "  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d ${ADMIN_DOMAIN} -d ${API_DOMAIN}"
fi
echo "======================================================================"
