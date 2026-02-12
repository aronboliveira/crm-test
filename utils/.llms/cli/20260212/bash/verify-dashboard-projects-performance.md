# verify-dashboard-projects-performance.sh

Replay command:

```bash
bash utils/.llms/cli/20260212/bash/verify-dashboard-projects-performance.sh
```

What it verifies:

1. No random row-key fallback in `DashboardProjectsPage.vue`.
2. Page-level `.module.scss` and frozen constants usage are wired.
3. Full web unit suite passes.
4. Web production build passes.
