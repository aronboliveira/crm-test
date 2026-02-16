# Mobile E2E Setup

This workspace now includes both a minimal Cypress setup and a Detox scaffold.

## Cypress (workspace-level smoke)

The Cypress setup in `apps/mobile` is a lightweight harness for workspace-level checks.

- Run smoke spec: `npm run cypress:run:smoke`
- Run tasks dashboard wiring spec: `npx cypress run --config-file cypress.config.ts --spec cypress/e2e/tasks-dashboard.cy.ts`
- Run all Cypress specs: `npm run cypress`
- Open Cypress UI: `npm run cypress:open`
- Run CI-friendly combined check (Cypress smoke + Detox doctor): `npm run test:e2e:mobile`

Current starter spec:

- `cypress/e2e/smoke.cy.ts`

## Detox (device-native E2E scaffold)

The Detox scaffold is configured for iOS simulator and Android emulator targets.

- Validate environment: `npm run detox:doctor`
- iOS build: `npm run detox:build:ios`
- iOS test: `npm run detox:test:ios`
- Android build: `npm run detox:build:android`
- Android test: `npm run detox:test:android`

Configuration files:

- `.detoxrc.cjs`
- `e2e/jest.config.cjs`
- `e2e/smoke.e2e.ts`

Important:

- Detox build commands assume a standard React Native native project structure (`ios/` and `android/`).
- If those folders are missing in this workspace, generate or attach native projects before running Detox build/test scripts.
