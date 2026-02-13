#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
TOKEN="${TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "TOKEN env var is required."
  echo "Example: TOKEN=\"<jwt>\" API_BASE_URL=\"http://localhost:3000\" $0"
  exit 1
fi

post_file() {
  local file_path="$1"
  local label="$2"
  echo "== Posting ${label}: ${file_path}"
  curl -sS -X POST "${API_BASE_URL%/}/import" \
    -H "Authorization: Bearer ${TOKEN}" \
    -F "file=@${file_path}" \
    | sed 's/^/  /'
  echo
}

post_file "$ROOT_DIR/import-large.csv" "CSV"
post_file "$ROOT_DIR/import-large.json" "JSON"
post_file "$ROOT_DIR/import-large.xml" "XML"
post_file "$ROOT_DIR/import-large.md" "MD"
