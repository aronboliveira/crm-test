#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
WEB_DIR="$ROOT_DIR/apps/web"
PAGE_FILE="$ROOT_DIR/apps/web/src/pages/IntegrationsPage.vue"
CARD_FILE="$ROOT_DIR/apps/web/src/components/integrations/IntegrationCard.vue"
CARD_STYLE_FILE="$ROOT_DIR/apps/web/src/styles/components/integrations/_integration-card.scss"
MODAL_FILE="$ROOT_DIR/apps/web/src/components/integrations/IntegrationHelpModal.vue"
MODAL_STYLE_FILE="$ROOT_DIR/apps/web/src/styles/components/integrations/integration-help-modal.module.scss"
HELP_SERVICE_FILE="$ROOT_DIR/apps/web/src/services/IntegrationHelpCatalogService.ts"
INTEGRATION_CONSTANTS_FILE="$ROOT_DIR/apps/web/src/utils/constants/integration-constants.ts"
AUTOCOMPLETE_SERVICE_FILE="$ROOT_DIR/apps/web/src/services/IntegrationConfigAutocompleteService.ts"
AUTOCOMPLETE_SERVICE_TEST_FILE="$ROOT_DIR/apps/web/__tests__/IntegrationConfigAutocompleteService.test.ts"
PAGE_STYLE_FILE="$ROOT_DIR/apps/web/src/styles/components/integrations/_integrations-page.scss"
MAIN_STYLE_FILE="$ROOT_DIR/apps/web/src/styles/main.scss"
COMPONENTS_STYLE_FILE="$ROOT_DIR/apps/web/src/styles/_components.scss"

echo "[1/14] Checking card-level Help button + DOMStringMap hooks..."
rg -n "data-help-target|data-integration-id|Abrir ajuda|has-logo|integration-logo" "$CARD_FILE"

echo "[2/14] Checking card action icon sets (info/router/gear-wide-connected)..."
rg -n "BOOTSTRAP_INFO_CIRCLE_ICON_PATHS|BOOTSTRAP_ROUTER_ICON_PATHS|BOOTSTRAP_GEAR_WIDE_CONNECTED_ICON_PATHS|btn-separator" "$CARD_FILE"

echo "[3/14] Checking integrations page wiring (modal + dataset handler + aria)..."
rg -n "IntegrationHelpModal|openIntegrationHelpFromTrigger|DOMStringMap|integration-help-trigger-main|data-help-scope" "$PAGE_FILE"

echo "[4/14] Checking help modal semantic tags, accordion, and accessibility landmarks..."
rg -n "<details|<summary|<abbr|<em|<strong|<dfn|<dl|<ul|<ol|role=\"dialog\"|aria-modal=\"true\"" "$MODAL_FILE"

echo "[5/14] Checking help modal module styles (@scope/:scope/@position-try/@starting-style/::details-content)..."
rg -n "@scope|:scope|@position-try|@starting-style|::details-content" "$MODAL_STYLE_FILE"

echo "[6/14] Checking integration card spacing and logo normalization styles..."
rg -n "card-body|card-actions|btn-separator|btn-label|has-logo|integration-logo|--integration-logo-scale|align-self: start" "$CARD_STYLE_FILE"

echo "[7/14] Checking integrations grid row-height behavior + modal entrance animation..."
rg -n "integrations-grid|align-items: start|glpi-config-modal|integration-modal-enter|integration-modal-backdrop-in|@starting-style" "$PAGE_STYLE_FILE"

echo "[8/14] Checking logo presentation tokens in integration constants..."
rg -n "INTEGRATION_LOGO_PRESENTATION|logoPresentation|scale:|offsetYRem:" "$INTEGRATION_CONSTANTS_FILE"

echo "[9/14] Checking integration config autocomplete service + 5s idle tracking..."
rg -n "PERSIST_IDLE_MS|schedulePersist|persistBatch|datalistId|forms|inputs|localStorage|StorageService|SafeJsonService" "$AUTOCOMPLETE_SERVICE_FILE"

echo "[10/14] Checking datalist wiring on integration config inputs..."
rg -n "integrationConfigDatalistId|getInputSuggestions|trackInputValueForSuggestions|data-form-id|data-input-id|datalist" "$PAGE_FILE"

echo "[11/14] Checking help catalog service coverage..."
rg -n "integrationId: \"glpi\"|integrationId: \"sat\"|integrationId: \"nextcloud\"|integrationId: \"zimbra\"|integrationId: \"outlook\"|integrationId: \"whatsapp\"" "$HELP_SERVICE_FILE"

echo "[12/14] Checking autocomplete service unit test presence..."
rg -n "IntegrationConfigAutocompleteService|persists values only after idle delay|sensitive fields" "$AUTOCOMPLETE_SERVICE_TEST_FILE"

echo "[13/14] Checking button cascade hardening (scoped integrations + no legacy global modal-close/button overrides)..."
rg -n "\\.integration-card \\.btn|\\.integration-card \\.btn-primary|\\.integration-card \\.btn-secondary|\\.integration-card \\.card-actions" "$CARD_STYLE_FILE"

if rg -n "^\\.btn\\s*\\{" "$MAIN_STYLE_FILE" >/dev/null; then
  echo "[ERROR] Legacy global .btn block still exists in main.scss" >&2
  exit 1
fi

if rg -n "^\\.btn-ghost\\s*\\{" "$MAIN_STYLE_FILE" >/dev/null; then
  echo "[ERROR] Legacy global .btn-ghost block still exists in main.scss" >&2
  exit 1
fi

if rg -n "^\\.btn-primary\\s*\\{" "$MAIN_STYLE_FILE" >/dev/null; then
  echo "[ERROR] Legacy global .btn-primary block still exists in main.scss" >&2
  exit 1
fi

if rg -n "^\\.btn-sm\\s*\\{" "$MAIN_STYLE_FILE" >/dev/null; then
  echo "[ERROR] Legacy global .btn-sm block still exists in main.scss" >&2
  exit 1
fi

if rg -n "^\\.modal-close\\s*\\{" "$COMPONENTS_STYLE_FILE" >/dev/null; then
  echo "[ERROR] Global .modal-close block still exists in _components.scss" >&2
  exit 1
fi

echo "[14/14] Running web tests + build..."
(
  cd "$WEB_DIR"
  npm test -- --run
  npm run build
)

echo "[OK] Integrations card + modal + autocomplete flow verified."
