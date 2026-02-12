#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"

cd "$WEB_DIR"

echo "[1/4] Checking random key fallback removal in DashboardTasksPage.vue"
if rg -n "Math\.random\(" src/pages/DashboardTasksPage.vue; then
  echo "[FAIL] Random key usage still present in DashboardTasksPage.vue"
  exit 1
fi

echo "[2/4] Checking style module wiring for dashboard pages"
rg -n "@use \"\.\./styles/pages/dashboard-clients\.module\";" src/pages/DashboardClientsPage.vue
rg -n "@use \"\.\./styles/pages/dashboard-tasks\.module\";" src/pages/DashboardTasksPage.vue

echo "[3/4] Running web unit tests"
npm test -- --run

echo "[4/4] Running web production build"
npm run build

echo "[OK] Dashboard clients/tasks memoization and style-module pass validated."
