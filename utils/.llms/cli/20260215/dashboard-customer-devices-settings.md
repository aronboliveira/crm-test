# Dashboard customer devices + settings criterion

Date: 2026-02-15

## Objective

Add a configurable definition of what is considered a **customer device** and expose the resulting analytics/table section in `Meus dispositivos`.

## Functional changes

1. Added a new persisted criteria service:
   - file: `apps/web/src/services/DevicesCustomerCriteriaService.ts`
   - storage key: `corp.admin.devices.customer.criteria.v1`
   - event: `devices:customer-criteria:updated`
   - criteria:
     - `same-domain`
     - `exclude-self`

2. Added Settings dashboard page:
   - file: `apps/web/src/pages/DashboardSettingsPage.vue`
   - route: `/dashboard/settings`
   - selector fieldset (`settings-customer-device-criteria`) for customer-device criteria.

3. Updated navigation and routing:
   - `apps/web/src/app/router.ts`: new `DashboardSettings` route.
   - `apps/web/src/components/shell/AsideViewNav.vue`:
     - settings route now points to `/dashboard/settings`
     - settings entry included in main nav list.

4. Extended Devices dashboard:
   - file: `apps/web/src/pages/DashboardDevicesPage.vue`
   - new final section: **Dispositivos de clientes**
     - displays active criterion
     - summary cards
     - charts (status, tipo, top fabricantes)
     - preview table
   - section reacts to criteria updates via event and persisted preference.

## Test updates

- Added unit tests:
  - `apps/web/__tests__/DevicesCustomerCriteriaService.test.ts`
- Added/updated Cypress tests:
  - `apps/web/cypress/e2e/dashboard/settings.cy.ts`
  - `apps/web/cypress/e2e/dashboard/devices.cy.ts` (customer section assertion)

## Validation commands

Run in `apps/web`:

```bash
npm run test -- --run
npx cypress run --browser electron --config baseUrl=http://localhost:5175 --env apiUrl=http://localhost:3100
```

If needed, start web with aligned API base:

```bash
VITE_API_BASE_URL=http://localhost:3100 npm run dev -- --host 0.0.0.0 --port 5175
```
