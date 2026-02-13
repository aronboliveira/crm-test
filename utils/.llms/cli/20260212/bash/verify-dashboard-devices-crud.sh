#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
API_DIR="$ROOT_DIR/apps/api"
WEB_DIR="$ROOT_DIR/apps/web"

RUN_WEB_TYPES=0
if [[ "${1:-}" == "--with-web-types" ]]; then
  RUN_WEB_TYPES=1
fi

echo "[1/11] Checking API devices wiring..."
rg -n "@Entity\('devices'\)|class DevicesService|@Controller\('/devices'\)" \
  "$ROOT_DIR/apps/api/src/entities/DeviceEntity.ts" \
  "$ROOT_DIR/apps/api/src/modules/devices/devices.service.ts" \
  "$ROOT_DIR/apps/api/src/modules/devices/devices.controller.ts"
rg -n "DeviceEntity|DevicesModule" \
  "$ROOT_DIR/apps/api/src/app.module.ts" \
  "$ROOT_DIR/apps/api/src/seed/mock-seed.module.ts" \
  "$ROOT_DIR/apps/api/src/seed/mock-seed.service.ts"

echo "[2/11] Checking web route/menu/page wiring..."
rg -n "dashboard/devices|DashboardDevices|DashboardDevicesPage" \
  "$ROOT_DIR/apps/web/src/app/router.ts" \
  "$ROOT_DIR/apps/web/src/pages/DashboardDevicesPage.vue"
rg -n "Meus dispositivos|motherboard" \
  "$ROOT_DIR/apps/web/src/components/shell/AsideViewNav.vue"

echo "[3/11] Checking devices smart autocomplete + form layout wiring..."
rg -n "devices-smart-input|devices-fieldset|devices-form-grid|devices-search-list|section-devices" \
  "$ROOT_DIR/apps/web/src/pages/DashboardDevicesPage.vue"
rg -n "commitSubmittedSmartValues|commitSubmitted\\(|suggest\\(value.trim\\(\\)\\)" \
  "$ROOT_DIR/apps/web/src/pages/DashboardDevicesPage.vue"

echo "[4/11] Checking devices chart/dashboard analytics + export wiring..."
rg -n "devices-charts|Status no Filtro|Tipos de Dispositivo|Fabricantes Mais Registrados|Sistemas Operacionais|Tags Mais Frequentes|Atividade nos Últimos|DonutChart|BarChart|handleOpenExportModal|DashboardTableExportModal|Exportar" \
  "$ROOT_DIR/apps/web/src/pages/DashboardDevicesPage.vue"
rg -n "class DeviceAnalyticsService|statusSlicesFromTotals|kindSlicesFromTotals|topVendors|topOperatingSystems|topTags|activityByDayFromSeries|shouldRenderTrend" \
  "$ROOT_DIR/apps/web/src/services/DeviceAnalyticsService.ts"
rg -n "DashboardDevicesCsvBlueprint|DASHBOARD_DEVICES_EXPORT_COLUMN_KEYS|DASHBOARD_DEVICES_EXPORT_COLUMNS|DASHBOARD_DEVICES_EXPORT_COLUMN_WIDTHS" \
  "$ROOT_DIR/apps/web/src/utils/export/blueprints/DashboardDevicesCsvBlueprint.ts" \
  "$ROOT_DIR/apps/web/src/utils/export/index.ts"
rg -n "DeviceQueryStateService|DEVICE_ROUTE_QUERY_KEYS|SEARCH: \"q\"|STATUS: \"s\"|KIND: \"k\"|PAGE: \"p\"|PAGE_SIZE: \"z\"|SORT_BY: \"b\"|SORT_DIR: \"d\"|fromQuery\\(|toQuery\\(|isSameState\\(" \
  "$ROOT_DIR/apps/web/src/services/DeviceQueryStateService.ts"
rg -n "class TableQueryStateService|QueryParsers|normalizeState\\(|normalizeInput\\(|toQuery\\(|fromQuery\\(" \
  "$ROOT_DIR/apps/web/src/services/TableQueryStateService.ts"
rg -n "AdminAuditQueryStateService|ADMIN_AUDIT_ROUTE_QUERY_KEYS|SEARCH: \"q\"|KIND: \"k\"|fromQuery\\(|toQuery\\(|isSameState\\(" \
  "$ROOT_DIR/apps/web/src/services/AdminAuditQueryStateService.ts"
rg -n "AdminUsersQueryStateService|ADMIN_USERS_ROUTE_QUERY_KEYS|SEARCH: \"q\"|ROLE_KEY: \"r\"|fromQuery\\(|toQuery\\(|isSameState\\(" \
  "$ROOT_DIR/apps/web/src/services/AdminUsersQueryStateService.ts"
rg -n "AdminMailOutboxQueryStateService|ADMIN_MAIL_OUTBOX_ROUTE_QUERY_KEYS|SEARCH: \"q\"|KIND: \"k\"|fromQuery\\(|toQuery\\(|isSameState\\(" \
  "$ROOT_DIR/apps/web/src/services/AdminMailOutboxQueryStateService.ts"
rg -n "TableExportPreferencesService|presetKey|table.export.preferences.v1|save\\(|load\\(" \
  "$ROOT_DIR/apps/web/src/services/TableExportPreferencesService.ts" \
  "$ROOT_DIR/apps/web/src/components/dashboard/DashboardTableExportModal.vue" \
  "$ROOT_DIR/apps/web/src/pages/DashboardDevicesPage.vue"
rg -n "class TableExportFlowOrchestrator|execute\\(|TableExportAlertGateway" \
  "$ROOT_DIR/apps/web/src/services/TableExportFlowOrchestrator.ts"
rg -n "new TableExportFlowOrchestrator\\(|exportFlow\\.execute\\(" \
  "$ROOT_DIR/apps/web/src/pages/DashboardDevicesPage.vue" \
  "$ROOT_DIR/apps/web/src/pages/AdminUsersPage.vue" \
  "$ROOT_DIR/apps/web/src/pages/AdminAuditPage.vue" \
  "$ROOT_DIR/apps/web/src/pages/AdminMailOutboxPage.vue" \
  "$ROOT_DIR/apps/web/src/pages/DashboardProjectsPage.vue" \
  "$ROOT_DIR/apps/web/src/pages/DashboardTasksPage.vue" \
  "$ROOT_DIR/apps/web/src/pages/DashboardMyWorkPage.vue" \
  "$ROOT_DIR/apps/web/src/pages/DashboardClientsPage.vue" \
  "$ROOT_DIR/apps/web/src/components/dashboard/ReportsView.vue"
rg -n "useRoute|useRouter|buildRouteState|applyRouteState|syncRouteQuery|router\\.replace|route\\.query|fetchAllFilteredRowsForExport|EXPORT_FETCH_LIMIT|EXPORT_MAX_PAGES|AdminApiService\\.mailOutboxList\\(" \
  "$ROOT_DIR/apps/web/src/pages/AdminMailOutboxPage.vue"
rg -n "fetchAllFilteredRowsForExport|EXPORT_FETCH_LIMIT|EXPORT_MAX_PAGES|AdminApiService\\.usersList\\(|buildUsersExportRows\\(sourceRows\\)|buildRecords: async" \
  "$ROOT_DIR/apps/web/src/pages/AdminUsersPage.vue"
rg -n "fetchAllFilteredRowsForExport|EXPORT_FETCH_LIMIT|EXPORT_MAX_PAGES|AdminApiService\\.auditList\\(|applyLocalFiltersAndSort\\(|buildAuditExportRows\\(sourceRows\\)|buildRecords: async" \
  "$ROOT_DIR/apps/web/src/pages/AdminAuditPage.vue"
rg -n "useRoute|useRouter|buildRouteState|applyRouteState|syncRouteQuery|router\\.replace|route\\.query|fetchAllFilteredRowsForExport|EXPORT_PAGE_SIZE|EXPORT_MAX_PAGES|buildExportRows\\(sourceRows\\)|ApiClientService\\.devices\\.list\\(" \
  "$ROOT_DIR/apps/web/src/pages/DashboardDevicesPage.vue"

echo "[5/11] Checking devices seed rebalance and chart readability guards..."
rg -n "targetDevices = 72|targetAdminDevices = 18|adminTopUpToCreate|adminVendorWeight|adminStatuses|dayOffset = isAdminOwner" \
  "$ROOT_DIR/apps/api/src/seed/mock-seed.service.ts"
rg -n "findAndCount|pageSize|sortBy|sortDir|nextCursor|analytics\\(|buildWhere|topOperatingSystems|topTags|activityByDay" \
  "$ROOT_DIR/apps/api/src/modules/devices/devices.service.ts" \
  "$ROOT_DIR/apps/api/src/modules/devices/devices.controller.ts"
rg -n "requestAnalyticsSnapshot|analyticsLoading|analyticsSnapshot|shouldRenderActivityTrend|activityNonZeroBars|devices-chart-card--ranking|devices-chart-card--activity|trend-line-width=\\\"1\\\"|show-trend-dots=\\\"false\\\"" \
  "$ROOT_DIR/apps/web/src/pages/DashboardDevicesPage.vue"
rg -n "goToPreviousPage|goToNextPage|handleSortChange|handlePageSizeChange|totalPages|devices-table-controls|devices-pagination" \
  "$ROOT_DIR/apps/web/src/pages/DashboardDevicesPage.vue"
rg -n "FormValidationStateService|formValidation\\.classMap|formValidation\\.markTouched|formValidation\\.markSubmitted|devices-validated-input" \
  "$ROOT_DIR/apps/web/src/pages/DashboardDevicesPage.vue"
rg -n "class FormValidationStateService|markTouched\\(|markSubmitted\\(|classMap\\(" \
  "$ROOT_DIR/apps/web/src/services/FormValidationStateService.ts"
rg -n "normalizedHeight|normalizedMaxBarWidth|--bar-chart-height|segments = Math.min\\(5, Math.max\\(1, maxValue.value\\)\\)" \
  "$ROOT_DIR/apps/web/src/components/charts/BarChart.vue"
rg -n "vector-effect=\\\"non-scaling-stroke\\\"" \
  "$ROOT_DIR/apps/web/src/components/charts/BarChart.vue"

echo "[6/11] Checking reusable utility abstractions (json/storage/input-list)..."
rg -n "class InputSuggestionListService|normalizeEntries|query\\(" \
  "$ROOT_DIR/apps/web/src/services/InputSuggestionListService.ts"
rg -n "class IdleTaskScheduler|schedule\\(|cancelAll\\(" \
  "$ROOT_DIR/apps/web/src/services/IdleTaskScheduler.ts"
rg -n "class StorageFacade|createFacade|resolveStore|isObject|parseArray|asObject|asArray" \
  "$ROOT_DIR/apps/web/src/services/StorageService.ts" \
  "$ROOT_DIR/apps/web/src/services/SafeJsonService.ts"

echo "[7/11] Checking global smart autocomplete limits and idle persistence..."
rg -n "MAX_SUGGESTIONS\\s*=\\s*5|PERSIST_DELAY_MS\\s*=\\s*5_000|commitSubmitted" \
  "$ROOT_DIR/apps/web/src/services/SmartAutocompleteService.ts"
rg -n "MAX_SUGGESTIONS\\s*=\\s*5|PERSIST_IDLE_MS\\s*=\\s*5_000|listSuggestions\\(" \
  "$ROOT_DIR/apps/web/src/services/IntegrationConfigAutocompleteService.ts"

echo "[8/11] Running API devices unit tests..."
(
  cd "$API_DIR"
  npm test -- --runInBand modules/devices/devices.service.spec.ts
)

echo "[9/11] Running API TypeScript check (no emit)..."
(
  cd "$API_DIR"
  npx tsc -p tsconfig.build.json --noEmit --incremental false
)

echo "[10/11] Running targeted web utility/chart/export unit tests..."
(
  cd "$WEB_DIR"
  npm test -- --run \
    __tests__/DeviceQueryStateService.test.ts \
    __tests__/AdminUsersQueryStateService.test.ts \
    __tests__/AdminAuditQueryStateService.test.ts \
    __tests__/AdminMailOutboxQueryStateService.test.ts \
    __tests__/TableExportPreferencesService.test.ts \
    __tests__/TableExportFlowOrchestrator.test.ts \
    __tests__/DashboardExportBlueprints.test.ts \
    __tests__/DevicesStoreFlow.test.ts \
    __tests__/DeviceAnalyticsService.test.ts \
    __tests__/FormValidationStateService.test.ts \
    __tests__/SmartAutocompleteService.test.ts \
    __tests__/IntegrationConfigAutocompleteService.test.ts \
    __tests__/InputSuggestionListService.test.ts \
    __tests__/IdleTaskScheduler.test.ts \
    __tests__/SafeJsonService.test.ts \
    __tests__/StorageService.test.ts
)

echo "[11/11] Running full web unit tests..."
(
  cd "$WEB_DIR"
  npm test -- --run
)

if [[ "$RUN_WEB_TYPES" -eq 1 ]]; then
  echo "[11/11 + types] Running web vue-tsc..."
  (
    cd "$WEB_DIR"
    npx vue-tsc -b --pretty false
  )
else
  echo "[11/11 + types] Skipping web vue-tsc."
  echo "      Use --with-web-types to include full web type-check."
fi

echo "[OK] Devices dashboard CRUD + charts + seed rebalance + smart autocomplete verification completed."
