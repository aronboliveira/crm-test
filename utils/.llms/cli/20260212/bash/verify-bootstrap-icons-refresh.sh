#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
WEB_DIR="$ROOT_DIR/apps/web"

ASIDE_FILE="$ROOT_DIR/apps/web/src/components/shell/AsideViewNav.vue"
PAGE_FILE="$ROOT_DIR/apps/web/src/pages/IntegrationsPage.vue"
CARD_FILE="$ROOT_DIR/apps/web/src/components/integrations/IntegrationCard.vue"

echo "[1/7] Checking sidebar icon key assignments (requested swaps)..."
rg -n "icon: \"briefcase\"|icon: \"stickies\"|icon: \"calendar3\"|icon: \"envelope-paper\"" "$ASIDE_FILE"

echo "[2/7] Checking sidebar icon renderer is Bootstrap path-driven..."
rg -n "BOOTSTRAP_NAV_ICON_PATHS|getNavIconPaths|v-for=\"\\(pathData, pathIndex\\) in getNavIconPaths\\(it.icon\\)\"" "$ASIDE_FILE"

echo "[3/7] Checking integration card action button icon sets..."
rg -n "BOOTSTRAP_INFO_CIRCLE_ICON_PATHS|BOOTSTRAP_ROUTER_ICON_PATHS|BOOTSTRAP_GEAR_WIDE_CONNECTED_ICON_PATHS" "$CARD_FILE"

echo "[4/7] Checking integration card fallback icon map migrated to Bootstrap..."
rg -n "BOOTSTRAP_FALLBACK_ICON_PATHS|FALLBACK_ICON_ALIASES|getFallbackIconPaths|integration-fallback-icon" "$CARD_FILE"

echo "[5/7] Checking integrations page header/notice Bootstrap icon usage..."
rg -n "BOOTSTRAP_LINK_45_DEG_ICON_PATHS|BOOTSTRAP_INFO_CIRCLE_ICON_PATHS|integrations-title-icon-path|integrations-notice-icon-path" "$PAGE_FILE"

echo "[6/7] Running web unit tests..."
(
  cd "$WEB_DIR"
  npm test -- --run
)

echo "[7/7] Running web production build..."
(
  cd "$WEB_DIR"
  npm run build
)

echo "[OK] Bootstrap icon refresh checks passed."
