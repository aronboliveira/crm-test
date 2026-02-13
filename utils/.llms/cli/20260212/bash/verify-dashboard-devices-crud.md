# verify-dashboard-devices-crud.sh

Replay command:

```bash
bash utils/.llms/cli/20260212/bash/verify-dashboard-devices-crud.sh
```

With web type-check:

```bash
bash utils/.llms/cli/20260212/bash/verify-dashboard-devices-crud.sh --with-web-types
```

What it verifies:

1. API devices entity/module/controller/service are wired in app + seed modules.
2. Web route/page/menu item for `Meus dispositivos` exists and uses `motherboard` icon.
3. `Meus dispositivos` page keeps themed fieldsets + smart datalist wiring (`section-devices`, `devices-smart-input`, `commitSubmitted` flow).
4. Devices page includes richer analytics charts (status/type/vendor/os/tags/activity) and uses `DeviceAnalyticsService`.
5. Devices dashboard export flow is wired:
   - `DashboardDevicesCsvBlueprint`
   - export column constants + widths + centered columns
   - `DashboardTableExportModal` + exporter action on devices page
   - CSV/XLSX export for all filtered rows (not only current table page).
6. Minimal URL query-state sync is wired for devices filters/table state:
   - compact query keys: `q`, `s`, `k`, `p`, `z`, `b`, `d`
   - `DeviceQueryStateService` normalize/parse/serialize helpers
   - route hydration + loop-safe sync guards in `DashboardDevicesPage.vue`
   - shared base codec: `TableQueryStateService` + `QueryParsers`
7. Admin table pages share compact query-state helpers:
   - `AdminAuditQueryStateService` (`q`, `k`)
   - `AdminUsersQueryStateService` (`q`, `r`)
   - `AdminMailOutboxQueryStateService` (`q`, `k`)
   - route-query precedence over session state in admin page boot sequence
   - outbox page route hydration + loop-safe query sync (`buildRouteState/applyRouteState/syncRouteQuery`)
8. Export modal preferences are persisted safely:
   - `TableExportPreferencesService` (`localStorage`) with robust normalization
   - per-module `presetKey` wiring in `DashboardTableExportModal`
   - saved values are validated against available columns/formats before use
9. Export flow orchestration is centralized:
   - `TableExportFlowOrchestrator` handles shared flow:
     - open dialog
     - empty-state guard
     - export invocation
     - success/error notifications
   - reused across devices/admin/reports/clients pages to reduce duplicated handlers
   - admin mail outbox export fetches all filtered rows via API cursor pagination (`fetchAllFilteredRowsForExport`)
   - admin users export fetches all filtered rows via API cursor pagination (`fetchAllFilteredRowsForExport`)
   - admin audit export fetches all filtered rows via API cursor pagination and reapplies local search/sort over full fetched set
10. Devices seed/chart rebalance checks exist:
   - backend seeds at least `72` devices globally and tops up at least `18` for `admin@corp.local`
   - weighted admin vendor/status distribution is present
   - devices API list supports server-side pagination/sort query and metadata (`page/pageSize/sortBy/sortDir`, `findAndCount`, `nextCursor`)
   - devices API exposes aggregated chart endpoint (`GET /devices/analytics`) with shared filter builder and top/day aggregates
   - devices page has sort/page-size/pagination controls wired to server requests
   - chart readability guards exist (`shouldRenderActivityTrend`, subtle `trend-line-color`, `trend-line-width="1"`, non-scaling stroke, dynamic chart height vars)
   - required-field invalid state is driven by reusable helper (`FormValidationStateService`, `is-touched/is-dirty/is-submitted`, `devices-validated-input`)
11. Utility abstractions for JSON/storage/input lists are present and reusable:
   - `SafeJsonService`, `StorageFacade`, `InputSuggestionListService`, `IdleTaskScheduler`.
12. Global smart autocomplete constraints are enforced:
   - 5-second idle persistence
   - max 5 visible suggestions
13. API unit test for `DevicesService` passes.
14. API TypeScript check passes with `--noEmit --incremental false`.
15. Targeted web tests for chart/export/store/autocomplete/json/storage utilities pass.
   - includes `FormValidationStateService.test.ts`.
   - includes `DeviceQueryStateService.test.ts`.
   - includes `AdminUsersQueryStateService.test.ts`.
   - includes `AdminAuditQueryStateService.test.ts`.
   - includes `AdminMailOutboxQueryStateService.test.ts`.
   - includes `TableExportPreferencesService.test.ts`.
   - includes `TableExportFlowOrchestrator.test.ts`.
16. Full web unit test suite passes.
17. Optional: `vue-tsc` run for web (`--with-web-types`).

Notes:

- `--with-web-types` adds strict `vue-tsc` validation for the web workspace.
