# CLI Commands — Session: Type Consolidation & Vue Script Extraction

# Date: 2025-07-24

## Type Checking (Frontend)

```bash
cd apps/web && npx vue-tsc --noEmit
```

## Run Tests (Frontend)

```bash
cd apps/web && npx vitest run
```

## Run Tests with UI (Frontend)

```bash
cd apps/web && npx vitest --ui
```

## Find Vue files sorted by script size

```bash
cd apps/web/src && find . -name '*.vue' -exec sh -c \
  'echo "=== {} ===" && awk "/<script/,/<\/script>/" "{}" | wc -l' \; \
  | paste - - | sort -t$'\t' -k2 -rn
```

## Search for type usage across workspace

```bash
grep -rn 'ResetResponse\|PermissionKey\|SessionUser\|UserProfile' apps/web/src/
```

## Search for inline interface definitions in Vue files

```bash
grep -rn 'interface ' apps/web/src/**/*.vue
```

## List all composable files

```bash
find apps/web/src/assets/scripts -name '*.ts' | sort
```

## Backend type check

```bash
cd apps/api && npx tsc --noEmit
```

## Delete file

```bash
rm <filepath>
```
