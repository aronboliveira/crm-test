#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"

echo "[1/2] Running web JSON safety tests..."
(
  cd "$ROOT_DIR/apps/web"
  npm test -- --run __tests__/SafeJsonService.test.ts __tests__/AssistantChatSocketProtocol.test.ts
)

echo "[2/2] Running api JSON safety tests..."
(
  cd "$ROOT_DIR/apps/api"
  npm test -- --runInBand common/json/safe-json.util.spec.ts modules/assistant/assistant-chat.protocol.spec.ts modules/webhooks/webhooks.controller.spec.ts modules/webhooks/webhooks.service.spec.ts
)

echo "JSON safety test suite completed."
