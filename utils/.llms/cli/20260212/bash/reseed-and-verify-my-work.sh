#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
SCRIPT="$ROOT_DIR/utils/.llms/notes/agents/my-work/scripts/reseed-and-verify-my-work.sh"

if [[ ! -x "$SCRIPT" ]]; then
  echo "Script not found or not executable: $SCRIPT"
  exit 1
fi

exec "$SCRIPT" "$@"
