# Check Console Statements

## Command

```bash
grep -rn "console\." apps/web/src/app apps/web/src/bootstrap apps/web/src/pinia apps/web/src/utils 2>/dev/null | head -20
```

## Date

2026-02-06

## Purpose

Checking for console statements in the analyzed directories

## Result

Found 1 console.warn statement:

- apps/web/src/bootstrap/BootstrapCoordinator.ts:21 - console.warn for bootstrap failures (acceptable for error logging)
