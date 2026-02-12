# verify-dashboard-clients-tasks-memoization.sh

Replay command:

```bash
bash utils/.llms/cli/20260212/bash/verify-dashboard-clients-tasks-memoization.sh
```

What it does:

1. Ensures unstable random row key fallback is absent in `DashboardTasksPage.vue`.
2. Verifies style-module imports for clients/tasks dashboard pages.
3. Runs full web unit tests.
4. Runs web production build.
