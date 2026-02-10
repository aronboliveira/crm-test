#!/bin/bash
# #INTEGRATION-AGENT Session Commands
# Date: 2026-02-09
# Purpose: GLPI Integration Development & Testing

# ============================================================
# 1. TESTING COMMANDS
# ============================================================

# Run all API tests (80 tests)
npm test --prefix apps/api

# Run GLPI-specific tests only (11 tests)
npm test --prefix apps/api -- --testPathPatterns="glpi"

# ============================================================
# 2. GIT COMMANDS - Granular Commits
# ============================================================

# Commit 1: Backend GLPI Adapter Implementation
git add apps/api/src/modules/integrations/adapters/glpi/
git commit -m "feat(api): add GLPI helpdesk integration adapter

- Add GlpiApiClient for low-level REST API communication
- Add GlpiDataMapper for bidirectional entity transformation
- Add GlpiAdapter implementing IntegrationAdapter interface
- Add comprehensive TypeScript types for GLPI entities
- Support session-based auth with App-Token header"

# Commit 2: Frontend SCSS & Accessibility Improvements
git add apps/web/src/styles/components/integrations/
git add apps/web/src/components/pages/IntegrationCard.vue
git add apps/web/src/pages/IntegrationsPage.vue
git add apps/web/src/styles/_components.scss
git commit -m "feat(web): extract integration styles to SCSS modules with accessibility

- Extract IntegrationCard scoped styles to _integration-card.scss
- Extract IntegrationsPage styles to _integrations-page.scss
- Add @starting-style entrance animations with reduced-motion support
- Add hover/focus transforms and transitions
- Add WAI-ARIA roles, labels, and keyboard navigation
- Fix dark mode background with CSS custom properties"

# Commit 3: Unit Tests for GLPI Adapter
git add apps/api/src/modules/integrations/adapters/glpi/glpi.adapter.spec.ts
git commit -m "test(api): add unit tests for GLPI adapter and data mapper

- Add 11 comprehensive unit tests covering:
  - GlpiAdapter: getStatus, configure, testConnection
  - GlpiDataMapper: ticketToCrmLead, userToCrmContact, entityToCrmClient
  - Status and priority mapping functions
- All tests pass successfully"

# ============================================================
# 3. MODULE UPDATES
# ============================================================

# Update integrations module to use new glpi/ directory
# Modified: apps/api/src/modules/integrations/integrations.module.ts
# Modified: apps/api/src/modules/integrations/integrations.service.ts

# ============================================================
# 4. BUILD VERIFICATION
# ============================================================

# Verify API builds successfully
npm run build --prefix apps/api

# Verify Web builds successfully  
npm run build --prefix apps/web

# ============================================================
# 5. DEVELOPMENT SERVERS
# ============================================================

# Start API in development mode
npm run start:dev --prefix apps/api

# Start Web in development mode
npm run dev --prefix apps/web
