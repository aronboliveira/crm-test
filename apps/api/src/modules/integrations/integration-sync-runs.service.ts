import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { createHash } from 'crypto';
import { MongoRepository } from 'typeorm';
import IntegrationSyncJobEntity from '../../entities/IntegrationSyncJobEntity';
import IntegrationSyncRecordEntity from '../../entities/IntegrationSyncRecordEntity';
import type {
  IntegrationSyncDataset,
  IntegrationSyncJobView,
  IntegrationSyncStats,
  IntegrationSyncSummary,
} from './types';

const ZERO_STATS: IntegrationSyncStats = Object.freeze({
  processed: 0,
  created: 0,
  updated: 0,
  unchanged: 0,
  deleted: 0,
  failed: 0,
});

@Injectable()
export class IntegrationSyncRunsService {
  private readonly logger = new Logger(IntegrationSyncRunsService.name);

  constructor(
    @InjectRepository(IntegrationSyncJobEntity)
    private readonly jobsRepository: MongoRepository<IntegrationSyncJobEntity>,
    @InjectRepository(IntegrationSyncRecordEntity)
    private readonly recordsRepository: MongoRepository<IntegrationSyncRecordEntity>,
  ) {}

  async createJob(
    integrationId: string,
    maxAttempts: number,
  ): Promise<IntegrationSyncJobEntity> {
    const entity = this.jobsRepository.create({
      jobId: this.createJobId(integrationId),
      integrationId,
      status: 'queued',
      attempt: 0,
      maxAttempts,
      summary: this.emptySummary(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.jobsRepository.save(entity as any);
  }

  async getJobView(jobId: string): Promise<IntegrationSyncJobView> {
    const job = await this.getJobOrThrow(jobId);
    return this.toView(job);
  }

  async markRunning(jobId: string, attempt: number): Promise<void> {
    await this.patchJob(jobId, (job) => {
      job.status = 'running';
      job.attempt = attempt;
      job.summary = this.emptySummary();
      job.lastError = undefined;
      if (!job.startedAt) {
        job.startedAt = new Date();
      }
      job.finishedAt = undefined;
    });
  }

  async markRetrying(
    jobId: string,
    attempt: number,
    errorMessage: string,
  ): Promise<void> {
    await this.patchJob(jobId, (job) => {
      job.status = 'retrying';
      job.attempt = attempt;
      job.lastError = errorMessage;
      job.finishedAt = undefined;
    });
  }

  async markFailed(
    jobId: string,
    attempt: number,
    errorMessage: string,
  ): Promise<void> {
    await this.patchJob(jobId, (job) => {
      job.status = 'failed';
      job.attempt = attempt;
      job.lastError = errorMessage;
      job.finishedAt = new Date();
    });
  }

  async markSucceeded(jobId: string, attempt: number): Promise<void> {
    await this.patchJob(jobId, (job) => {
      job.status = 'succeeded';
      job.attempt = attempt;
      job.lastError = undefined;
      job.finishedAt = new Date();
    });
  }

  async reconcileDataset(
    jobId: string,
    integrationId: string,
    dataset: IntegrationSyncDataset,
  ): Promise<IntegrationSyncStats> {
    const counters = this.emptyStats();
    const seen = new Set<string>();

    for (const [index, record] of dataset.records.entries()) {
      try {
        const externalId = this.resolveExternalId(
          record,
          index,
          dataset.externalIdField,
        );

        if (!externalId) {
          counters.failed += 1;
          continue;
        }

        seen.add(externalId);
        const now = new Date();
        const checksum = this.computeChecksum(record);
        const existing = await this.recordsRepository.findOne({
          where: {
            integrationId,
            recordType: dataset.recordType,
            externalId,
          } as any,
        });

        if (!existing) {
          const created = this.recordsRepository.create({
            integrationId,
            recordType: dataset.recordType,
            externalId,
            checksum,
            payload: record,
            isDeleted: false,
            firstSeenAt: now,
            lastSeenAt: now,
            lastSyncedAt: now,
            lastJobId: jobId,
          });

          await this.recordsRepository.save(created as any);
          counters.created += 1;
          counters.processed += 1;
          continue;
        }

        const changed = existing.checksum !== checksum || existing.isDeleted;
        existing.checksum = checksum;
        existing.payload = record;
        existing.isDeleted = false;
        existing.deletedAt = undefined;
        existing.lastSeenAt = now;
        existing.lastSyncedAt = now;
        existing.lastJobId = jobId;

        await this.recordsRepository.save(existing as any);

        if (changed) {
          counters.updated += 1;
        } else {
          counters.unchanged += 1;
        }
        counters.processed += 1;
      } catch (error) {
        counters.failed += 1;
        this.logger.error(
          `Failed to reconcile ${integrationId}/${dataset.recordType}`,
          error as Error,
        );
      }
    }

    if (dataset.deletedExternalIds?.length) {
      const deletedIds = [...new Set(dataset.deletedExternalIds)];
      for (const externalId of deletedIds) {
        if (!externalId || seen.has(externalId)) {
          continue;
        }
        const existing = await this.recordsRepository.findOne({
          where: {
            integrationId,
            recordType: dataset.recordType,
            externalId,
          } as any,
        });

        if (!existing || existing.isDeleted) {
          continue;
        }

        existing.isDeleted = true;
        existing.deletedAt = new Date();
        existing.lastSyncedAt = new Date();
        existing.lastJobId = jobId;
        await this.recordsRepository.save(existing as any);
        counters.deleted += 1;
      }
    }

    return counters;
  }

  async appendDatasetSummary(
    jobId: string,
    recordType: string,
    stats: IntegrationSyncStats,
  ): Promise<void> {
    await this.patchJob(jobId, (job) => {
      const currentByType = job.summary.byType[recordType] ?? this.emptyStats();
      job.summary.byType[recordType] = this.mergeStats(currentByType, stats);
      job.summary.total = this.mergeStats(job.summary.total, stats);
    });
  }

  private async getJobOrThrow(jobId: string): Promise<IntegrationSyncJobEntity> {
    const job = await this.jobsRepository.findOne({
      where: { jobId } as any,
    });
    if (!job) {
      throw new NotFoundException(`Sync job not found: ${jobId}`);
    }
    return job;
  }

  private async patchJob(
    jobId: string,
    mutator: (job: IntegrationSyncJobEntity) => void,
  ): Promise<void> {
    const job = await this.getJobOrThrow(jobId);
    mutator(job);
    await this.jobsRepository.save(job as any);
  }

  private mergeStats(
    base: IntegrationSyncStats,
    delta: IntegrationSyncStats,
  ): IntegrationSyncStats {
    return {
      processed: base.processed + delta.processed,
      created: base.created + delta.created,
      updated: base.updated + delta.updated,
      unchanged: base.unchanged + delta.unchanged,
      deleted: base.deleted + delta.deleted,
      failed: base.failed + delta.failed,
    };
  }

  private emptySummary(): IntegrationSyncSummary {
    return {
      total: this.emptyStats(),
      byType: {},
    };
  }

  private emptyStats(): IntegrationSyncStats {
    return { ...ZERO_STATS };
  }

  private resolveExternalId(
    record: Record<string, unknown>,
    index: number,
    preferredField?: string,
  ): string | null {
    const candidates = preferredField
      ? [preferredField]
      : ['sourceId', 'id', 'path', 'number', 'code', 'document', 'email', 'name'];

    for (const key of candidates) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }

    const fallbackId = this.computeChecksum(record);
    this.logger.warn(
      `Missing external identity field for sync record, using checksum fallback (${fallbackId.slice(0, 12)}) at index ${index}`,
    );
    return fallbackId;
  }

  private computeChecksum(payload: Record<string, unknown>): string {
    const normalized = this.stableSerialize(payload);
    return createHash('sha256').update(normalized).digest('hex');
  }

  private stableSerialize(value: unknown): string {
    if (value instanceof Date) {
      return JSON.stringify(value.toISOString());
    }
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableSerialize(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      const keys = Object.keys(objectValue).sort();
      return `{${keys
        .map(
          (key) => `${JSON.stringify(key)}:${this.stableSerialize(objectValue[key])}`,
        )
        .join(',')}}`;
    }
    return JSON.stringify(value);
  }

  private toView(job: IntegrationSyncJobEntity): IntegrationSyncJobView {
    return {
      jobId: job.jobId,
      integrationId: job.integrationId,
      status: job.status,
      attempt: job.attempt,
      maxAttempts: job.maxAttempts,
      summary: job.summary ?? this.emptySummary(),
      lastError: job.lastError,
      startedAt: this.toIsoString(job.startedAt),
      finishedAt: this.toIsoString(job.finishedAt),
      createdAt: this.toIsoString(job.createdAt) ?? new Date().toISOString(),
      updatedAt: this.toIsoString(job.updatedAt) ?? new Date().toISOString(),
    };
  }

  private toIsoString(value: Date | string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }
    if (typeof value === 'string') {
      return value;
    }
    return value.toISOString();
  }

  private createJobId(integrationId: string): string {
    return `sync-${integrationId}-${Date.now()}-${new ObjectId()
      .toHexString()
      .slice(0, 8)}`;
  }
}
