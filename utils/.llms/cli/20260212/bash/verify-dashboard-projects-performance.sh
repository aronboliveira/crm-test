#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"

cd "$WEB_DIR"

echo "[1/4] Checking random key fallback removal in DashboardProjectsPage.vue"
if rg -n "Math\.random\(" src/pages/DashboardProjectsPage.vue; then
  echo "[FAIL] Random key usage still present in DashboardProjectsPage.vue"
  exit 1
fi

echo "[2/4] Checking style module + constants wiring"
rg -n "@use \"\.\./styles/pages/dashboard-projects\.module\";" src/pages/DashboardProjectsPage.vue
rg -n "PROJECT_STATUS_LABEL_BY_ID|PROJECT_FILTER_DEFAULTS" src/pages/DashboardProjectsPage.vue

echo "[3/4] Running web unit tests"
npm test -- --run

echo "[4/4] Running web production build"
npm run build

echo "[OK] Dashboard projects performance pass validated."
