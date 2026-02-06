# CLI Commands — General Development Workflow

# Reusable across sessions

## Install dependencies (root monorepo)

```bash
npm install
```

## Frontend dev server

```bash
cd apps/web && npx vite
```

## Frontend build

```bash
cd apps/web && npx vite build
```

## Frontend type check

```bash
cd apps/web && npx vue-tsc --noEmit
```

## Frontend tests

```bash
cd apps/web && npx vitest run
```

## Frontend tests — watch mode

```bash
cd apps/web && npx vitest
```

## Frontend tests — UI mode

```bash
cd apps/web && npx vitest --ui
```

## Backend type check

```bash
cd apps/api && npx tsc --noEmit
```

## Backend dev server

```bash
cd apps/api && npx nest start --watch
```

## Backend build

```bash
cd apps/api && npx nest build
```

## Backend tests

```bash
cd apps/api && npx jest
```

## Lint (root)

```bash
npx eslint .
```

## Grep for pattern across monorepo

```bash
grep -rn '<pattern>' apps/ packages/ --include='*.ts' --include='*.vue'
```

## Find files by extension

```bash
find . -name '*.ts' -not -path '*/node_modules/*' | sort
```

## Count lines per file type

```bash
find apps/web/src -name '*.vue' -o -name '*.ts' | xargs wc -l | sort -n
```
