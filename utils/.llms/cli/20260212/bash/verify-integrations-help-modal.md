# verify-integrations-help-modal.sh

Replay command:

```bash
bash utils/.llms/cli/20260212/bash/verify-integrations-help-modal.sh
```

What it verifies:

1. `IntegrationCard.vue` keeps action button hooks and card dataset wiring.
2. `IntegrationCard.vue` keeps Bootstrap button icons for `Ajuda`, `Testar Conexão`, and `Configurar`.
3. `IntegrationsPage.vue` keeps DOMStringMap-based help trigger wiring.
4. `IntegrationHelpModal.vue` keeps semantic rich accordion markup.
5. `integration-help-modal.module.scss` keeps scoped modal directives and transitions.
6. `_integration-card.scss` keeps spacing refinements and logo normalization rules.
7. `_integrations-page.scss` keeps grid `align-items: start` and modal entrance animations.
8. `integration-constants.ts` keeps provider-specific `logoPresentation` scale/offset tokens.
9. `IntegrationConfigAutocompleteService.ts` keeps 5s idle persistence + nested `{forms,inputs}` history.
10. `IntegrationsPage.vue` keeps datalist/autocomplete wiring (`data-form-id`, `data-input-id`).
11. `IntegrationHelpCatalogService.ts` keeps help entries for all configured integrations.
12. `IntegrationConfigAutocompleteService.test.ts` covers persistence/sensitivity/defaults.
13. Button cascade hardening remains enforced:
   - integration card action buttons are scoped under `.integration-card ...`
   - legacy duplicate global button blocks are absent from `main.scss`
   - generic global `.modal-close` rule is absent from `_components.scss`
14. Web unit tests and production build pass.
