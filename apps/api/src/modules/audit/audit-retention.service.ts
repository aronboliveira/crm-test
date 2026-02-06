import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';

import AuthAuditEventEntity from '../../entities/AuthAuditEventEntity';
import PasswordResetRequestEntity from '../../entities/PasswordResetRequestEntity';

@Injectable()
export default class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);

  constructor(
    @InjectRepository(AuthAuditEventEntity)
    private readonly auditRepo: MongoRepository<AuthAuditEventEntity>,
    @InjectRepository(PasswordResetRequestEntity)
    private readonly resetRepo: MongoRepository<PasswordResetRequestEntity>,
  ) {
    try {
      if (!auditRepo || !resetRepo) {
        this.logger.error('One or more repositories not injected');
        throw new Error('Repository initialization failed');
      }
      this.logger.log('AuditRetentionService initialized');
    } catch (error) {
      this.logger.error('AuditRetentionService constructor error:', error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runDaily(): Promise<void> {
    try {
      const now = Date.now();

      const auditDays = AuditRetentionService.clampInt(
        process.env.AUDIT_RETENTION_DAYS,
        90,
        7,
        3650,
      );
      const resetDays = AuditRetentionService.clampInt(
        process.env.RESET_RETENTION_DAYS,
        14,
        3,
        365,
      );

      const auditCutIso = new Date(
        now - auditDays * 24 * 60 * 60_000,
      ).toISOString();
      const resetCutIso = new Date(
        now - resetDays * 24 * 60 * 60_000,
      ).toISOString();

      try {
        await this.auditRepo.delete({
          createdAt: { $lt: auditCutIso } as any,
        } as any);
        this.logger.log(`Deleted audit records older than ${auditDays} days`);
      } catch (error) {
        this.logger.error('Error deleting old audit records:', error);
      }

      try {
        await this.resetRepo.delete({
          createdAt: { $lt: resetCutIso } as any,
        } as any);
        await this.resetRepo.delete({
          expiresAt: { $lt: new Date(now).toISOString() } as any,
        } as any);
        this.logger.log(`Deleted reset requests older than ${resetDays} days`);
      } catch (error) {
        this.logger.error('Error deleting old reset requests:', error);
      }
    } catch (error) {
      this.logger.error('Error in daily retention cleanup:', error);
    }
  }

  private static clampInt(
    v: unknown,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN;
    const x = Number.isFinite(n) ? Math.trunc(n) : fallback;
    return x < min ? min : x > max ? max : x;
  }
}
