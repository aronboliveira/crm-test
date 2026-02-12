# verify-admin-audit-card-width.sh

Replay command:

```bash
bash utils/.llms/cli/20260212/bash/verify-admin-audit-card-width.sh
```

With production build:

```bash
bash utils/.llms/cli/20260212/bash/verify-admin-audit-card-width.sh --with-build
```

What it verifies:

1. `AdminAuditPage.vue` keeps the refreshed overview layout classes (`audit-overview*` + grid cards).
2. Page width clamp remains `min(100%, 1500px)`.
3. Summary/charts grid tracks remain responsive (`minmax(13.5rem, 1fr)` and `minmax(21rem, 1fr)`).
4. `BarChart` components remain mounted for audit stats.
5. Web unit test suite passes.
6. Optional: web production build (`--with-build`).
