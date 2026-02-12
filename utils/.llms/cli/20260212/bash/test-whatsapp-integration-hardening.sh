#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"

echo "[1/2] Running web JSON guard regression tests..."
(
  cd "$ROOT_DIR/apps/web"
  npm test -- --run __tests__/SafeJsonService.test.ts __tests__/AssistantChatSocketProtocol.test.ts
)

echo "[2/2] Running WhatsApp + mail adapter integration tests..."
(
  cd "$ROOT_DIR/apps/api"
  npm test -- --runInBand \
    modules/integrations/adapters/whatsapp/whatsapp.adapter.spec.ts \
    modules/integrations/adapters/whatsapp/whatsapp-api.client.spec.ts \
    modules/integrations/adapters/whatsapp/whatsapp-data.mapper.spec.ts \
    modules/integrations/adapters/outlook.adapter.spec.ts \
    modules/integrations/adapters/zimbra.adapter.spec.ts
)

echo "WhatsApp integration hardening suite completed."
