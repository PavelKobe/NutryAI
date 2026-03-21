#!/bin/bash
# =============================================================================
# Обновление с GitHub и пересборка на VM после пуша в main.
#
# Куда класть на ВМ: никуда отдельно — файл уже в репо по пути
#   app/scripts/vm_deploy_pull.sh
# (после clone он лежит в /var/www/nutriaidiary/app/scripts/).
#
# Запуск (из любого каталога):
#   bash /var/www/nutriaidiary/app/scripts/vm_deploy_pull.sh
#
# От root (сделает git pull от пользователя владельца репо + деплой):
#   sudo bash /var/www/nutriaidiary/app/scripts/vm_deploy_pull.sh
#
# Режим:
#   DEPLOY_MODE=systemd  — по умолчанию: venv, alembic, npm build, restart units
#   DEPLOY_MODE=docker   — docker compose build + up -d + alembic в контейнере
#
# Переменные:
#   APP_ROOT      — корень приложения (по умолчанию /var/www/nutriaidiary/app)
#   GIT_BRANCH    — ветка для pull (по умолчанию текущая tracked branch)
# =============================================================================
set -euo pipefail

: "${APP_ROOT:=/var/www/nutriaidiary/app}"
: "${DEPLOY_MODE:=systemd}"

if [[ ! -d "$APP_ROOT" ]]; then
  echo "Ошибка: нет каталога APP_ROOT=$APP_ROOT"
  exit 1
fi

if ! git -C "$APP_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  echo "Ошибка: $APP_ROOT не внутри git-репозитория (ожидается symlink на .../NutryAI/app)."
  exit 1
fi

REPO_ROOT="$(git -C "$APP_ROOT" rev-parse --show-toplevel)"
GIT_DIR="${REPO_ROOT}/.git"
if [[ ! -d "$GIT_DIR" && ! -f "$GIT_DIR" ]]; then
  echo "Ошибка: не найден .git у $REPO_ROOT"
  exit 1
fi

GIT_OWNER="$(stat -c '%U' "$GIT_DIR" 2>/dev/null || true)"
if [[ -z "$GIT_OWNER" || "$GIT_OWNER" == "UNKNOWN" ]]; then
  GIT_OWNER="nutriaidiary"
fi

git_pull() {
  run_git() {
    if [[ "$(id -u)" -eq 0 ]]; then
      sudo -u "$GIT_OWNER" git -C "$REPO_ROOT" "$@"
    else
      git -C "$REPO_ROOT" "$@"
    fi
  }

  if [[ "$(id -u)" -ne 0 && "$(id -un)" != "$GIT_OWNER" ]]; then
    echo "Запустите скрипт от root (sudo) или от пользователя $GIT_OWNER — владельца $GIT_DIR"
    exit 1
  fi

  run_git fetch origin
  if [[ -n "${GIT_BRANCH:-}" ]]; then
    run_git checkout "$GIT_BRANCH"
    run_git pull --ff-only origin "$GIT_BRANCH"
  else
    run_git pull --ff-only
  fi
}

echo "=== [1/2] git pull (repo: $REPO_ROOT, ветка: ${GIT_BRANCH:-текущая}) ==="
git_pull
echo "OK: репозиторий обновлён."
echo ""

echo "=== [2/2] деплой (DEPLOY_MODE=$DEPLOY_MODE) ==="
case "$DEPLOY_MODE" in
  systemd)
    if [[ "$(id -u)" -eq 0 ]]; then
      sudo -u "$GIT_OWNER" bash "${APP_ROOT}/scripts/vm_install_app.sh"
    else
      bash "${APP_ROOT}/scripts/vm_install_app.sh"
    fi
    ;;
  docker)
    if ! command -v docker >/dev/null 2>&1; then
      echo "Ошибка: docker не найден. Установите Docker или используйте DEPLOY_MODE=systemd."
      exit 1
    fi
    cd "$APP_ROOT"
    docker compose build
    docker compose up -d
    if docker compose exec -T api alembic upgrade head; then
      echo "Alembic: upgrade head (exec)"
    else
      echo "Повтор Alembic через одноразовый контейнер..."
      docker compose run --rm api alembic upgrade head
    fi
    ;;
  *)
    echo "Ошибка: неизвестный DEPLOY_MODE=$DEPLOY_MODE (допустимо: systemd, docker)"
    exit 1
    ;;
esac

echo ""
echo "Готово. Проверка:"
echo "  curl -sS http://127.0.0.1:8000/health"
echo "  curl -sI http://127.0.0.1:3000 | head -n1"
