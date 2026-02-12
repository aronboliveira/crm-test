# test-whatsapp-integration-flow.sh

## Purpose

Valida a trilha completa de integração WhatsApp no backend:

1. configurar credenciais
2. testar conexão
3. verificar health
4. disparar sync
5. consultar status do sync job

## Command

```bash
bash utils/.llms/cli/20260212/bash/test-whatsapp-integration-flow.sh
```

## Required Env Vars

```bash
export WHATSAPP_ACCESS_TOKEN='...'
export WHATSAPP_BUSINESS_ACCOUNT_ID='...'
```

## Optional Env Vars

```bash
export WHATSAPP_PHONE_NUMBER_ID='...'
export WHATSAPP_API_VERSION='v18.0'
export API_BASE_URL='http://127.0.0.1:3000'
export CRM_API_BEARER_TOKEN='...'
export WHATSAPP_SKIP_CONFIG='0' # use 1 to skip configure step
export SYNC_POLL_ATTEMPTS='20'
export SYNC_POLL_INTERVAL_SECONDS='2'
```

## Behavior

- If `WHATSAPP_SKIP_CONFIG=0` (default), the script configures credentials first.
- If `WHATSAPP_SKIP_CONFIG=1`, it reuses stored backend config and runs only test/health/sync checks.
- Sync job is polled until `succeeded` or `failed`; timeout/failure returns non-zero exit code.

## Better Comments Handoff

- `TODO(user)`: preencher credenciais reais da Meta antes da execução.
- `IMPORTANT`: após validar, rotacionar token e manter segredo apenas em vault/secret manager.
