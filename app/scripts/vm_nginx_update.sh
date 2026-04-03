#!/bin/bash
# =============================================================================
# Обновление nginx-конфига для Nutriaidiary.
#
# Что делает:
#   1. Добавляет rate-limiting зоны в /etc/nginx/conf.d/nutriaidiary-rate-limits.conf
#   2. Перезаписывает /etc/nginx/sites-available/nutriaidiary:
#      — сохраняет все HTTP→HTTPS редиректы и www→non-www без изменений
#      — сохраняет Frontend и Admin блоки без изменений
#      — в API-блоке разделяет location / на три:
#          /api/v1/auth/  (limit: 10 req/min, burst=5)
#          /api/v1/       (limit: 100 req/min, burst=20)
#          /              (без лимита — health check и корень)
#   3. Делает резервную копию текущего конфига
#   4. Тестирует (nginx -t) и перезагружает nginx
#
# Запуск (от root):
#   sudo bash /home/nutriaidiary/nutriaidiary-src/app/scripts/vm_nginx_update.sh
# =============================================================================
set -euo pipefail

NGINX_CONF="/etc/nginx/sites-available/nutriaidiary"
NGINX_LINK="/etc/nginx/sites-enabled/nutriaidiary"
RATE_CONF="/etc/nginx/conf.d/nutriaidiary-rate-limits.conf"
BACKUP_DIR="/etc/nginx/backups"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Ошибка: запустите от root (sudo bash $0)"
  exit 1
fi

# ─── Резервная копия ──────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if [[ -f "$NGINX_CONF" ]]; then
  cp "$NGINX_CONF" "${BACKUP_DIR}/nutriaidiary_${TIMESTAMP}.conf"
  echo "Резервная копия: ${BACKUP_DIR}/nutriaidiary_${TIMESTAMP}.conf"
fi

# ─── [1/3] Rate-limiting зоны ────────────────────────────────────────────────
echo ""
echo "[1/3] Запись rate-limiting зон → ${RATE_CONF}..."

cat > "$RATE_CONF" <<'EOF'
# Rate limiting для Nutriaidiary (создан vm_nginx_update.sh).
#
# auth_limit — для /api/v1/auth/* (защита от brute-force)
# api_limit  — для всех остальных /api/v1/* эндпоинтов
#
# Зоны объявляются здесь (http-контекст nginx.conf включает conf.d/*.conf).

limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api_limit:10m  rate=100r/m;

limit_req_status 429;
EOF

echo "OK: ${RATE_CONF}"

# ─── [2/3] Полный конфиг sites-available/nutriaidiary ───────────────────────
echo ""
echo "[2/3] Запись ${NGINX_CONF}..."

cat > "$NGINX_CONF" <<'NGINXEOF'
# Nutriaidiary nginx — обновлён vm_nginx_update.sh.
# Rate limiting: зоны auth_limit и api_limit объявлены в
#   /etc/nginx/conf.d/nutriaidiary-rate-limits.conf

# ─── HTTP → HTTPS (web) ───────────────────────────────────────────────────────
server {
    listen 80;
    server_name nutriaidiary.com www.nutriaidiary.com;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://nutriaidiary.com$request_uri; }
}

# ─── HTTP → HTTPS (api) ───────────────────────────────────────────────────────
server {
    listen 80;
    server_name api.nutriaidiary.com;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://api.nutriaidiary.com$request_uri; }
}

# ─── HTTP → HTTPS (admin) ────────────────────────────────────────────────────
server {
    listen 80;
    server_name admin.nutriaidiary.com;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://admin.nutriaidiary.com$request_uri; }
}

# ─── HTTPS www → non-www ─────────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    server_name www.nutriaidiary.com;
    ssl_certificate     /etc/letsencrypt/live/nutriaidiary.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nutriaidiary.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;
    return 301 https://nutriaidiary.com$request_uri;
}

# ─── Frontend Next.js ─────────────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    server_name nutriaidiary.com;
    access_log /var/log/nginx/nutriaidiary-web-access.log;
    error_log  /var/log/nginx/nutriaidiary-web-error.log;
    ssl_certificate     /etc/letsencrypt/live/nutriaidiary.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nutriaidiary.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    location /.well-known/acme-challenge/ { root /var/www/html; }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }
}

# ─── Admin panel ──────────────────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    server_name admin.nutriaidiary.com;
    access_log /var/log/nginx/nutriaidiary-admin-access.log;
    error_log  /var/log/nginx/nutriaidiary-admin-error.log;
    ssl_certificate     /etc/letsencrypt/live/nutriaidiary.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nutriaidiary.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    location /.well-known/acme-challenge/ { root /var/www/html; }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }
}

# ─── API FastAPI ──────────────────────────────────────────────────────────────
# CORS отдаёт FastAPI (CORSMiddleware в main.py) — не дублировать add_header здесь.
server {
    listen 443 ssl http2;
    server_name api.nutriaidiary.com;
    access_log /var/log/nginx/nutriaidiary-api-access.log;
    error_log  /var/log/nginx/nutriaidiary-api-error.log;
    client_max_body_size 25m;
    ssl_certificate     /etc/letsencrypt/live/nutriaidiary.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nutriaidiary.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    location /.well-known/acme-challenge/ { root /var/www/html; }

    # Auth-эндпоинты: 10 req/min per IP, burst=5 (защита от brute-force)
    location /api/v1/auth/ {
        limit_req zone=auth_limit burst=5 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin $http_origin;
        proxy_connect_timeout 300s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }

    # Остальные API-эндпоинты: 100 req/min per IP, burst=20
    location /api/v1/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin $http_origin;
        proxy_connect_timeout 300s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }

    # Catchall: /health, / — без rate limit
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin $http_origin;
        proxy_connect_timeout 300s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }
}
NGINXEOF

ln -sf "$NGINX_CONF" "$NGINX_LINK"
echo "OK: ${NGINX_CONF}"

# ─── [3/3] Тест и перезагрузка ───────────────────────────────────────────────
echo ""
echo "[3/3] nginx -t && systemctl reload nginx..."
nginx -t
systemctl reload nginx

echo ""
echo "======================================================================"
echo "Готово! Изменения:"
echo "  + /etc/nginx/conf.d/nutriaidiary-rate-limits.conf (rate zones)"
echo "  + API-блок: location / → /api/v1/auth/ + /api/v1/ + /"
echo ""
echo "Лимиты:"
echo "  /api/v1/auth/*  → 10 req/min per IP  (burst=5,  ~brute-force)"
echo "  /api/v1/*       → 100 req/min per IP (burst=20, ~DoS)"
echo ""
echo "Проверка:"
echo "  curl -sS https://api.nutriaidiary.com/health"
echo "  curl -sI https://nutriaidiary.com | head -1"
echo "======================================================================"
