#!/bin/bash
# =============================================================================
# Установка зависимостей, миграции, сборка Next, включение systemd.
# Запуск от пользователя приложения (рекомендуется) или от root с sudo -u:
#
#   sudo -u nutriaidiary bash /var/www/nutriaidiary/app/scripts/vm_install_app.sh
#
# Переменные окружения (опционально):
#   APP_ROOT  — корень приложения (по умолчанию /var/www/nutriaidiary/app)
# =============================================================================
set -euo pipefail

: "${APP_ROOT:=/var/www/nutriaidiary/app}"

BACKEND="${APP_ROOT}/backend"
WEB="${APP_ROOT}/web"

if [[ ! -f "${BACKEND}/main.py" ]]; then
  echo "Ошибка: не найден ${BACKEND}/main.py. Сначала vm_clone_from_github.sh или проверьте APP_ROOT=$APP_ROOT"
  exit 1
fi

if [[ ! -f "${WEB}/package.json" ]]; then
  echo "Ошибка: не найден ${WEB}/package.json"
  exit 1
fi

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Запуск от root нежелателен: venv и npm создадутся от root."
  echo "Используйте: sudo -u nutriaidiary bash $0"
  exit 1
fi

echo "APP_ROOT=$APP_ROOT"
echo ""

echo "[1/4] Python venv и pip..."
cd "$BACKEND"
if [[ ! -d venv ]]; then
  python3 -m venv venv
fi
# shellcheck source=/dev/null
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "[2/4] Alembic (нужен рабочий ${APP_ROOT}/.env с DATABASE_URL)..."
if [[ ! -f "${APP_ROOT}/.env" ]]; then
  echo "Предупреждение: нет ${APP_ROOT}/.env — alembic может упасть."
  echo "Скопируйте .env.example -> .env и заполните, затем перезапустите этот скрипт или выполните вручную:"
  echo "  cd $BACKEND && . venv/bin/activate && alembic upgrade head"
else
  set -a
  # shellcheck source=/dev/null
  source "${APP_ROOT}/.env"
  set +a
  alembic upgrade head
fi

echo ""
echo "[3/4] Next.js: npm ci && npm run build..."
cd "$WEB"
if [[ ! -f .env.production ]]; then
  echo "Предупреждение: нет ${WEB}/.env.production — создайте с NEXT_PUBLIC_API_BASE_URL и NEXT_PUBLIC_SITE_URL."
fi
npm ci
npm run build

echo ""
echo "[4/4] systemd (нужен sudo)..."
if command -v sudo >/dev/null 2>&1; then
  sudo systemctl daemon-reload
  sudo systemctl enable nutriaidiary-api nutriaidiary-web
  sudo systemctl restart nutriaidiary-api nutriaidiary-web || sudo systemctl start nutriaidiary-api nutriaidiary-web
  sudo systemctl --no-pager status nutriaidiary-api nutriaidiary-web || true
else
  echo "sudo не найден — включите сервисы вручную от root:"
  echo "  systemctl enable --now nutriaidiary-api nutriaidiary-web"
fi

echo ""
echo "Проверка:"
echo "  curl -sS http://127.0.0.1:8000/health"
echo "  curl -sI http://127.0.0.1:3000 | head -n1"
