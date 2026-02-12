#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"

echo "[1/3] Running JSON safety targeted suite..."
bash "$ROOT_DIR/utils/.llms/cli/20260212/bash/test-json-safety-solid-dry.sh"

echo "[2/3] Running full web unit suite..."
(
  cd "$ROOT_DIR/apps/web"
  npm test -- --run
)

echo "[3/3] Running full api unit suite..."
(
  cd "$ROOT_DIR/apps/api"
  npm test -- --runInBand
)

echo "Retry recovery full suite completed."
