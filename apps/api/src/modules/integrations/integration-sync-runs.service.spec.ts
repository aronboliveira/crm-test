import { NotFoundException } from '@nestjs/common';
import { IntegrationSyncRunsService } from './integration-sync-runs.service';

describe('IntegrationSyncRunsService', () => {
  let service: IntegrationSyncRunsService;
  let jobsStore: Map<string, any>;
  let recordsStore: Map<string, any>;

  beforeEach(() => {
    jobsStore = new Map<string, any>();
    recordsStore = new Map<string, any>();

    const jobsRepository = {
      create: jest.fn((entity: any) => entity),
      save: jest.fn(async (entity: any) => {
        const now = new Date();
        const current = jobsStore.get(entity.jobId) || {};
        const persisted = {
          ...current,
          ...entity,
          createdAt: current.createdAt ?? entity.createdAt ?? now,
          updatedAt: now,
        };
        jobsStore.set(entity.jobId, persisted);
        return persisted;
      }),
      findOne: jest.fn(async ({ where }: any) => {
        if (!where?.jobId) {
          return null;
        }
        return jobsStore.get(where.jobId) ?? null;
      }),
    };

    const recordsRepository = {
      create: jest.fn((entity: any) => entity),
      save: jest.fn(async (entity: any) => {
        const now = new Date();
        const key = `${entity.integrationId}:${entity.recordType}:${entity.externalId}`;
        const current = recordsStore.get(key) || {};
        const persisted = {
          ...current,
          ...entity,
          createdAt: current.createdAt ?? entity.createdAt ?? now,
          updatedAt: now,
        };
        recordsStore.set(key, persisted);
        return persisted;
      }),
      findOne: jest.fn(async ({ where }: any) => {
        if (!where) {
          return null;
        }
        const key = `${where.integrationId}:${where.recordType}:${where.externalId}`;
        return recordsStore.get(key) ?? null;
      }),
    };

    service = new IntegrationSyncRunsService(
      jobsRepository as never,
      recordsRepository as never,
    );
  });

  it('creates queued sync jobs with empty summary', async () => {
    const created = await service.createJob('glpi', 3);
    const view = await service.getJobView(created.jobId);

    expect(view.integrationId).toBe('glpi');
    expect(view.status).toBe('queued');
    expect(view.maxAttempts).toBe(3);
    expect(view.summary.total).toEqual({
      processed: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      deleted: 0,
      failed: 0,
    });
  });

  it('reconciles dataset with idempotent create/update/unchanged/delete stats', async () => {
    const job = await service.createJob('sat', 3);
    await service.markRunning(job.jobId, 1);

    const first = await service.reconcileDataset(job.jobId, 'sat', {
      recordType: 'invoices',
      externalIdField: 'sourceId',
      records: [
        { sourceId: '1', number: 'INV-001', total: 100 },
        { sourceId: '2', number: 'INV-002', total: 200 },
        { sourceId: '3', number: 'INV-003', total: 300 },
      ],
    });
    await service.appendDatasetSummary(job.jobId, 'invoices', first);

    const second = await service.reconcileDataset(job.jobId, 'sat', {
      recordType: 'invoices',
      externalIdField: 'sourceId',
      records: [
        { sourceId: '1', number: 'INV-001', total: 100 },
        { sourceId: '2', number: 'INV-002', total: 250 },
      ],
      deletedExternalIds: ['3'],
    });
    await service.appendDatasetSummary(job.jobId, 'invoices', second);
    await service.markSucceeded(job.jobId, 1);

    expect(first).toEqual({
      processed: 3,
      created: 3,
      updated: 0,
      unchanged: 0,
      deleted: 0,
      failed: 0,
    });
    expect(second).toEqual({
      processed: 2,
      created: 0,
      updated: 1,
      unchanged: 1,
      deleted: 1,
      failed: 0,
    });

    const view = await service.getJobView(job.jobId);
    expect(view.status).toBe('succeeded');
    expect(view.summary.total).toEqual({
      processed: 5,
      created: 3,
      updated: 1,
      unchanged: 1,
      deleted: 1,
      failed: 0,
    });
  });

  it('throws NotFoundException for unknown jobs', async () => {
    await expect(service.getJobView('missing-job')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
