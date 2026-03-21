#!/bin/bash
# =============================================================================
# Клонирование репозитория NutryAI с GitHub и привязка APP_ROOT для bootstrap.
#
# Ожидаемая структура репо: в корне есть каталог app/ с backend/ и web/.
# Bootstrap и systemd используют APP_ROOT=/var/www/nutriaidiary/app
#
# Запуск от root:
#   sudo bash vm_clone_from_github.sh
#
# Переменные окружения (опционально):
#   REPO_URL       — URL git (по умолчанию git@github.com:PavelKobe/NutryAI.git)
#   DEPLOY_USER    — пользователь владелец клона (по умолчанию nutriaidiary)
#   CLONE_PARENT   — родительский каталог (по умолчанию /var/www/nutriaidiary)
#   REPO_DIR_NAME  — имя каталога клона (по умолчанию nutriaidiary-repo)
#   REPO_DIR       — полный путь к уже существующему клону (если задан — clone не делаем)
# =============================================================================
set -euo pipefail

: "${REPO_URL:=git@github.com:PavelKobe/NutryAI.git}"
: "${DEPLOY_USER:=nutriaidiary}"
: "${CLONE_PARENT:=/var/www/nutriaidiary}"
: "${REPO_DIR_NAME:=nutriaidiary-repo}"

APP_LINK="${CLONE_PARENT}/app"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Запустите от root: sudo bash $0"
  exit 1
fi

if ! id "$DEPLOY_USER" &>/dev/null; then
  echo "Ошибка: пользователь $DEPLOY_USER не существует. Сначала vm_bootstrap_yandex.sh или создайте пользователя."
  exit 1
fi

install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$CLONE_PARENT"

if [[ -n "${REPO_DIR:-}" ]]; then
  SRC_APP="${REPO_DIR}/app"
  if [[ ! -d "$SRC_APP/backend" || ! -d "$SRC_APP/web" ]]; then
    echo "Ошибка: в REPO_DIR=$REPO_DIR нет app/backend и app/web"
    exit 1
  fi
  echo "Используем существующий клон: $REPO_DIR"
else
  FULL_REPO="${CLONE_PARENT}/${REPO_DIR_NAME}"
  if [[ -d "${FULL_REPO}/.git" ]]; then
    echo "Репозиторий уже есть: $FULL_REPO — делаю git pull..."
    sudo -u "$DEPLOY_USER" git -C "$FULL_REPO" pull --ff-only
  else
    if [[ -e "$FULL_REPO" ]]; then
      echo "Ошибка: $FULL_REPO существует, но это не git-репозиторий. Удалите или задайте REPO_DIR_NAME."
      exit 1
    fi
    echo "Клонирование $REPO_URL -> $FULL_REPO"
    sudo -u "$DEPLOY_USER" git clone "$REPO_URL" "$FULL_REPO"
  fi
  SRC_APP="${FULL_REPO}/app"
  if [[ ! -d "$SRC_APP/backend" || ! -d "$SRC_APP/web" ]]; then
    echo "Ошибка: после клона ожидался каталог $SRC_APP с backend и web."
    echo "Проверьте, что в репозитории путь app/backend и app/web (как в GitHub PavelKobe/NutryAI)."
    exit 1
  fi
fi

# Symlink /var/www/nutriaidiary/app -> .../app
if [[ -L "$APP_LINK" ]]; then
  rm -f "$APP_LINK"
elif [[ -e "$APP_LINK" ]]; then
  echo "Ошибка: $APP_LINK существует и не symlink. Переименуйте или удалите вручную."
  exit 1
fi

ln -sfn "$SRC_APP" "$APP_LINK"
chown -h "$DEPLOY_USER:$DEPLOY_USER" "$APP_LINK" 2>/dev/null || true

echo ""
echo "Готово."
echo "  APP_ROOT (symlink): $APP_LINK -> $SRC_APP"
echo "Дальше: .env, затем sudo -u $DEPLOY_USER bash .../app/scripts/vm_install_app.sh"
echo "  (полный путь к скрипту: ${APP_LINK}/scripts/vm_install_app.sh)"
