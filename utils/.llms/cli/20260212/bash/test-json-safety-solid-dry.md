# test-json-safety-solid-dry.sh

## Purpose

Executa o pacote de testes unitários de segurança de JSON e refactors SOLID/DRY.

## Command

```bash
bash utils/.llms/cli/20260212/bash/test-json-safety-solid-dry.sh
```

## Covers

- Web
  - `apps/web/__tests__/SafeJsonService.test.ts`
  - `apps/web/__tests__/AssistantChatSocketProtocol.test.ts`
- API
  - `apps/api/src/common/json/safe-json.util.spec.ts`
  - `apps/api/src/modules/assistant/assistant-chat.protocol.spec.ts`
  - `apps/api/src/modules/webhooks/webhooks.controller.spec.ts`
  - `apps/api/src/modules/webhooks/webhooks.service.spec.ts`
