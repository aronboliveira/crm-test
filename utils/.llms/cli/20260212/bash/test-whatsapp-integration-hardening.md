# test-whatsapp-integration-hardening.sh

## Purpose

Valida o hardening de JSON e o comportamento da integração WhatsApp/adapters de mail.

## Command

```bash
bash utils/.llms/cli/20260212/bash/test-whatsapp-integration-hardening.sh
```

## Covers

- Web
  - `apps/web/__tests__/SafeJsonService.test.ts`
  - `apps/web/__tests__/AssistantChatSocketProtocol.test.ts`
- API
  - `apps/api/src/modules/integrations/adapters/whatsapp/whatsapp.adapter.spec.ts`
  - `apps/api/src/modules/integrations/adapters/whatsapp/whatsapp-api.client.spec.ts`
  - `apps/api/src/modules/integrations/adapters/whatsapp/whatsapp-data.mapper.spec.ts`
  - `apps/api/src/modules/integrations/adapters/outlook.adapter.spec.ts`
  - `apps/api/src/modules/integrations/adapters/zimbra.adapter.spec.ts`
