#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
WHATSAPP_SKIP_CONFIG="${WHATSAPP_SKIP_CONFIG:-0}"
SYNC_POLL_ATTEMPTS="${SYNC_POLL_ATTEMPTS:-20}"
SYNC_POLL_INTERVAL_SECONDS="${SYNC_POLL_INTERVAL_SECONDS:-2}"

# TODO(user): set real Meta credentials before running this flow.
WHATSAPP_ACCESS_TOKEN="${WHATSAPP_ACCESS_TOKEN:-}"
WHATSAPP_BUSINESS_ACCOUNT_ID="${WHATSAPP_BUSINESS_ACCOUNT_ID:-}"
WHATSAPP_PHONE_NUMBER_ID="${WHATSAPP_PHONE_NUMBER_ID:-}"
WHATSAPP_API_VERSION="${WHATSAPP_API_VERSION:-v18.0}"
CRM_API_BEARER_TOKEN="${CRM_API_BEARER_TOKEN:-}"

if [[ "$WHATSAPP_SKIP_CONFIG" != "1" ]]; then
  if [[ -z "$WHATSAPP_ACCESS_TOKEN" || -z "$WHATSAPP_BUSINESS_ACCOUNT_ID" ]]; then
    echo "Missing required env vars."
    echo "Required: WHATSAPP_ACCESS_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID"
    echo "Optional: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_VERSION, CRM_API_BEARER_TOKEN"
    echo "Set WHATSAPP_SKIP_CONFIG=1 to skip configuration and only test existing setup."
    exit 1
  fi
fi

AUTH_HEADERS=()
if [[ -n "$CRM_API_BEARER_TOKEN" ]]; then
  AUTH_HEADERS=(-H "Authorization: Bearer ${CRM_API_BEARER_TOKEN}")
fi

CONFIG_PAYLOAD=$(cat <<JSON
{
  "accessToken": "${WHATSAPP_ACCESS_TOKEN}",
  "businessAccountId": "${WHATSAPP_BUSINESS_ACCOUNT_ID}",
  "phoneNumberId": "${WHATSAPP_PHONE_NUMBER_ID}",
  "apiVersion": "${WHATSAPP_API_VERSION}"
}
JSON
)

if [[ "$WHATSAPP_SKIP_CONFIG" == "1" ]]; then
  echo "[1/5] Skipping configuration (WHATSAPP_SKIP_CONFIG=1)"
else
  echo "[1/5] Configuring WhatsApp integration..."
  curl -sS -f -X POST "${API_BASE_URL}/integrations/whatsapp/configure" \
    -H "Content-Type: application/json" \
    "${AUTH_HEADERS[@]}" \
    --data "$CONFIG_PAYLOAD"
  echo
fi

echo "[2/5] Testing WhatsApp connection..."
curl -sS -f -X POST "${API_BASE_URL}/integrations/whatsapp/test" \
  -H "Content-Type: application/json" \
  "${AUTH_HEADERS[@]}"
echo

echo "[3/5] Checking WhatsApp health..."
curl -sS -f "${API_BASE_URL}/integrations/whatsapp/health" \
  -H "Content-Type: application/json" \
  "${AUTH_HEADERS[@]}"
echo

echo "[4/5] Triggering WhatsApp sync..."
SYNC_RESPONSE=$(curl -sS -f -X POST "${API_BASE_URL}/integrations/whatsapp/sync" \
  -H "Content-Type: application/json" \
  "${AUTH_HEADERS[@]}")
printf '%s\n' "$SYNC_RESPONSE"

echo "[5/5] Fetching sync job snapshot (if jobId is returned)..."
JOB_ID=$(printf '%s' "$SYNC_RESPONSE" | sed -n 's/.*"jobId":"\([^"]*\)".*/\1/p')
if [[ -z "$JOB_ID" ]]; then
  echo "No jobId found in sync response."
  exit 0
fi

FINAL_JOB=""
FINAL_STATUS=""
for ((attempt=1; attempt<=SYNC_POLL_ATTEMPTS; attempt+=1)); do
  JOB_RESPONSE=$(curl -sS -f "${API_BASE_URL}/integrations/sync-jobs/${JOB_ID}" \
    -H "Content-Type: application/json" \
    "${AUTH_HEADERS[@]}")
  STATUS=$(printf '%s' "$JOB_RESPONSE" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')
  echo "sync-job ${JOB_ID}: poll ${attempt}/${SYNC_POLL_ATTEMPTS} -> status=${STATUS:-unknown}"

  if [[ "$STATUS" == "succeeded" || "$STATUS" == "failed" ]]; then
    FINAL_JOB="$JOB_RESPONSE"
    FINAL_STATUS="$STATUS"
    break
  fi

  sleep "$SYNC_POLL_INTERVAL_SECONDS"
done

if [[ -z "$FINAL_JOB" ]]; then
  echo "Sync job did not reach terminal state within polling window."
  exit 1
fi

printf '%s\n' "$FINAL_JOB"

if [[ "$FINAL_STATUS" == "failed" ]]; then
  echo "Sync job finished with failure status."
  exit 1
fi

# IMPORTANT: after validation, keep only rotated/stored secrets in your secret manager.
