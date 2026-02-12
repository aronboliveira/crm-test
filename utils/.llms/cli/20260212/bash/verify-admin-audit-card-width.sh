#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
WEB_DIR="$ROOT_DIR/apps/web"
PAGE_FILE="$ROOT_DIR/apps/web/src/pages/AdminAuditPage.vue"
RUN_BUILD=0

if [[ "${1:-}" == "--with-build" ]]; then
  RUN_BUILD=1
fi

echo "[1/4] Checking audit layout classes are present..."
rg -n "audit-page|audit-overview|audit-overview__header|audit-summary-grid|audit-charts-grid|audit-chart-card" "$PAGE_FILE"

echo "[2/4] Checking audit page width clamp (1500px)..."
rg -n "width:\s*min\(100%,\s*1500px\)" "$PAGE_FILE"

echo "[3/4] Checking summary/charts grid tracks + chart component usage..."
rg -n "minmax\(13\.5rem,\s*1fr\)" "$PAGE_FILE"
rg -n "minmax\(21rem,\s*1fr\)" "$PAGE_FILE"
rg -n "align-items:\s*start" "$PAGE_FILE"
rg -n "<BarChart" "$PAGE_FILE"

echo "[4/4] Running web unit tests..."
(
  cd "$WEB_DIR"
  npm test -- --run
)

if [[ "$RUN_BUILD" -eq 1 ]]; then
  echo "[extra] Running web production build..."
  (
    cd "$WEB_DIR"
    npm run build
  )
else
  echo "[extra] Skipping build (use --with-build to include it)."
fi

echo "[OK] Admin audit card width tuning verified."
