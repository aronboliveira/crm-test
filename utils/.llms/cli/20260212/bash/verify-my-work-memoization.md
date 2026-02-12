# verify-my-work-memoization.sh

## Purpose

Valida os ajustes de performance/manutenibilidade do dashboard `Meu Trabalho`:

1. memoization/cache em agregações e lookups
2. extração de estilo para `.module.scss`
3. dicionários congelados para valores escalares

## Replay command

```bash
bash utils/.llms/cli/20260212/bash/verify-my-work-memoization.sh
```

## What it verifies

1. `DashboardMyWorkPage.vue` mantém `v-show` para seções de alto churn (`showProjects` e `showCharts`).
2. `_dashboard-my-work.module.scss` mantém os clamps de espaçamento do header e do card de prazos.
3. `cd apps/web && npm test -- --run`
4. `cd apps/web && npm run build`
