# Find Target Directory Files

## Command

```bash
find apps/web/src/app apps/web/src/bootstrap apps/web/src/pinia apps/web/src/utils -type f \( -name "*.ts" -o -name "*.vue" \) 2>/dev/null | sort
```

## Date

2026-02-06

## Purpose

Finding all TypeScript and Vue files in target directories (app, bootstrap, pinia, utils)

## Output

Found 21 files across the directories
