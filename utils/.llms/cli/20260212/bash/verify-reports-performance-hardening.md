# verify-reports-performance-hardening.sh

Replay command:

```bash
bash utils/.llms/cli/20260212/bash/verify-reports-performance-hardening.sh
```

What it verifies:

1. No random table-key fallback in `ReportsView.vue`.
2. Reports service/constants wiring is present.
3. Reports page/component style-module imports are present.
4. Web unit suite passes.
5. Web production build passes.
