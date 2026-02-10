# Nextcloud Webhooks (server integration)

## Overview

This project implements a Nextcloud webhook receiver at `/webhooks/nextcloud` that verifies an HMAC signature using the `NEXTCLOUD_WEBHOOK_SECRET` environment variable. The endpoint does NOT use OAuth.

## Server endpoint

- POST `/webhooks/nextcloud?userId=USERID`
- Header: `x-nextcloud-signature: <hmac-sha256-hex>` (optional if `NEXTCLOUD_WEBHOOK_SECRET` is set)
- Body: JSON payload supplied by Nextcloud webhook app

## Example curl (verify disabled)

```bash
curl -X POST 'https://your.app/webhooks/nextcloud?userId=alice' \
  -H 'Content-Type: application/json' \
  -d '{"event":"file_created","path":"/Documents/report.pdf","name":"report.pdf"}'
```

## Registering a webhook on Nextcloud

Nextcloud webhook registration APIs vary depending on installed apps (Activity, Webhooks, etc.). If your Nextcloud instance exposes a webhook registration endpoint that accepts basic auth (app passwords), you can use the helper script at `apps/api/scripts/register-nextcloud-webhook.ts`:

```bash
export NEXTCLOUD_REG_URL=https://nextcloud.example/ocs/v2.php/apps/activity/api/v2/webhook
export NEXTCLOUD_USER=alice
export NEXTCLOUD_PASS="app-password"
export WEBHOOK_TARGET="https://your.app/webhooks/nextcloud?userId=alice"
export NEXTCLOUD_WEBHOOK_SECRET="${SOME_SECRET}"
node apps/api/scripts/register-nextcloud-webhook.ts
```

## Notes

- The receiver validates HMAC SHA256 signatures when `NEXTCLOUD_WEBHOOK_SECRET` is present.
- Use Nextcloud app passwords or a provisioning API to avoid giving out full user credentials.
- This integration purposely avoids OAuth as requested; if you later want delegated flows for richer APIs, we can add them.
