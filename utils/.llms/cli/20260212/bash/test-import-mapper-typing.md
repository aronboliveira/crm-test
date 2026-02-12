# test-import-mapper-typing.sh

Replay command:

```bash
bash utils/.llms/cli/20260212/bash/test-import-mapper-typing.sh
```

What it verifies:

1. `ImportDraftMappers.ts` has a typed registry dictionary (`ImportDraftMapperByKind`).
2. `resolve` uses a generic keyed return type (`ImportDraftByKind[TKind]`).
3. Import-focused unit tests pass.
4. Web production build (`vue-tsc -b && vite build`) passes.
