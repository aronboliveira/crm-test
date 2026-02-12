#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
PAGE_FILE="$ROOT_DIR/apps/web/src/pages/DashboardMyWorkPage.vue"
STYLE_FILE="$ROOT_DIR/apps/web/src/styles/pages/_dashboard-my-work.module.scss"

echo "[1/4] Checking My Work page toggles to avoid frequent remount..."
rg -n "v-show=\"showProjects\"|v-show=\"showCharts\"" "$PAGE_FILE"

echo "[2/4] Checking My Work header/deadlines spacing clamps..."
rg -n "grid-template-columns:\s*minmax\(0,\s*1\.35fr\)\s*auto" "$STYLE_FILE"
rg -n "padding-inline-start:\s*clamp\(1\.85rem,\s*3vw,\s*2\.7rem\)" "$STYLE_FILE"
rg -n "padding-block-start:\s*clamp\(1\.18rem,\s*1\.45vw,\s*1\.36rem\)" "$STYLE_FILE"

echo "[3/4] Running web unit tests..."
(
  cd "$ROOT_DIR/apps/web"
  npm test -- --run
)

echo "[4/4] Building web app (type-check + production bundle)..."
(
  cd "$ROOT_DIR/apps/web"
  npm run build
)

echo "My Work memoization/style-module validation completed."
