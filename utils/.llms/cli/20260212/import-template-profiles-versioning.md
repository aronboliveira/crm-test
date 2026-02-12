# Import Templates: Shared Persistence, Versioning and Profiles

## Scope

Implemented the requested import improvements:

1. Shared server-side template persistence.
2. Template versioning with preview diff before apply.
3. One-click source profiles (`ERP A`, `ERP B`, `Planilha X`) per entity kind.

## Backend

- Added `ImportTemplateEntity` for Mongo persistence:
  - `apps/api/src/entities/ImportTemplateEntity.ts`
- Added built-in profile catalog:
  - `apps/api/src/modules/import/import-template-profiles.catalog.ts`
- Added template service:
  - `apps/api/src/modules/import/import-templates.service.ts`
- Added template controller:
  - `apps/api/src/modules/import/import-templates.controller.ts`
- Wired module/app registrations:
  - `apps/api/src/modules/import/import.module.ts`
  - `apps/api/src/app.module.ts`

### New routes

- `GET /import/templates/profiles?kind=clients|projects|users`
- `GET /import/templates?kind=...`
- `GET /import/templates/:id`
- `POST /import/templates`
- `PATCH /import/templates/:id`
- `DELETE /import/templates/:id`
- `POST /import/templates/:id/mark-used`
- `POST /import/templates/:id/preview-apply`

## Frontend

- API methods/types for templates and profiles:
  - `apps/web/src/services/ApiClientService.ts`
- Import modal integrated with server templates + versions + profiles:
  - `apps/web/src/components/import/ImportEntityModal.vue`
  - `apps/web/src/components/import/ImportEntityModal.module.scss`
- Local personalization now tracks last-used server template id:
  - `apps/web/src/utils/import/ImportPersonalizationService.ts`

## Tests

- Added/updated backend spec:
  - `apps/api/src/modules/import/import-templates.service.spec.ts`
- Existing web import/export tests remain green.

Commands used:

```bash
npm test --prefix apps/web -- --run
npm run build --prefix apps/web
npm test --prefix apps/api -- --runInBand
```

Notes:

- `npm run build --prefix apps/api` currently fails in this environment due file ownership/permissions in `apps/api/dist` (`EACCES` on cleanup).
