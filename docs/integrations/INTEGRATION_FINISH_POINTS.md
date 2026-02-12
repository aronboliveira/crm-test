# Integration Finish Points (GLPI, SAT, Nextcloud, Zimbra, Outlook)

This file indexes all explicit code markers for pending work beyond credential setup.

## Grep helper

```bash
rg -n "// \\* FINISH INTEGRATION HERE" apps/api/src/modules/integrations
```

## What still remains besides keys

- Domain projection from synchronized snapshots into core CRM models
  (`LeadEntity`, `ClientEntity`, `AttachmentEntity`) with business conflict rules.
- Optional domain-side notifications/workflows for changes detected in sync.

## Marker locations

- `apps/api/src/modules/integrations/integrations.service.ts`
  - synced records are now persisted and reconciled, but projection into core CRM
    domain entities is still pending for all real integrations.
- `apps/api/src/modules/integrations/adapters/zimbra.adapter.ts`
  - current real snapshot scope is unread emails + upcoming calls.
  - contacts/tasks/domain projection mapping is still pending.
- `apps/api/src/modules/integrations/adapters/outlook.adapter.ts`
  - current real snapshot uses Graph polling and first discoverable mailbox.
  - tenant mailbox scoping + delta/webhook sync path is still pending.

## Already implemented

- Real sync job orchestration with persisted lifecycle:
  queued/running/retrying/succeeded/failed + attempts.
- Retry/backoff flow for `POST /integrations/:id/sync`.
- Persisted idempotent reconciliation store per integration record type:
  created/updated/unchanged/deleted/failed counters.
- `GET /integrations/sync-jobs/:jobId` for sync job status polling.
- Adapter-level normalized snapshots for GLPI, SAT, Nextcloud, Zimbra, and Outlook.
