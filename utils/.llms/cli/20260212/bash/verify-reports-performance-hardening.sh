#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"

cd "$WEB_DIR"

echo "[1/5] Checking random-key fallbacks removed for reports tables"
if rg -n "Math\.random\(" src/components/dashboard/ReportsView.vue; then
  echo "[FAIL] Random key usage still present in ReportsView.vue"
  exit 1
fi

echo "[2/5] Checking ReportsMetricsService + reports constants wiring"
rg -n "ReportsMetricsService|dashboard-reports.constants" src/components/dashboard/ReportsView.vue

echo "[3/5] Checking module style imports"
rg -n "@use \"\.\./styles/pages/dashboard-reports-page\.module\";" src/pages/DashboardReportsPage.vue
rg -n "@use \"\.\./\.\./styles/pages/reports-view\.module\";" src/components/dashboard/ReportsView.vue

echo "[4/5] Running web unit tests"
npm test -- --run

echo "[5/5] Running web production build"
npm run build

echo "[OK] Reports performance/hardening pass validated."
