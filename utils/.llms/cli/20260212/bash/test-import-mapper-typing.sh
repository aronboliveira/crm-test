#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
WEB_DIR="$ROOT_DIR/apps/web"
MAPPER_FILE="$ROOT_DIR/apps/web/src/utils/import/ImportDraftMappers.ts"

echo "[1/4] Checking typed mapper registry dictionary exists..."
rg -n "type ImportDraftMapperByKind" "$MAPPER_FILE"
rg -n "private readonly mapperByKind: ImportDraftMapperByKind" "$MAPPER_FILE"

echo "[2/4] Checking generic resolve signature uses keyed return type..."
rg -n "resolve<TKind extends ImportEntityKind>" "$MAPPER_FILE"
rg -n "ImportDraftMapper<ImportDraftByKind\\[TKind\\]>" "$MAPPER_FILE"

echo "[3/4] Running targeted import tests..."
(
  cd "$WEB_DIR"
  npm test -- --run __tests__/ImportSourceIngestionService.test.ts __tests__/ImportBlueprints.test.ts
)

echo "[4/4] Running web production build..."
(
  cd "$WEB_DIR"
  npm run build
)

echo "[OK] Import mapper typing replay completed."
