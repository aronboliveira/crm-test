import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { createHash } from 'crypto';
import AuthAuditEventEntity from '../../../entities/AuthAuditEventEntity';
import type { PagedResult } from '../../audit/types/audit.types';

type Query = Readonly<{
  actorUserId?: string;
  targetUserId?: string;
  kind?: string;
  q?: string;
  cursor?: string;
  limit?: string;
}>;

@Injectable()
export default class AuditAdminService {
  private readonly logger = new Logger(AuditAdminService.name);

  constructor(
    @InjectRepository(AuthAuditEventEntity)
    private readonly repo: MongoRepository<AuthAuditEventEntity>,
  ) {
    try {
      if (!repo) {
        this.logger.error('Repository not injected');
        throw new Error('Repository initialization failed');
      }
      this.logger.log('AuditAdminService initialized');
    } catch (error) {
      this.logger.error('AuditAdminService constructor error:', error);
      throw error;
    }
  }

  async list(query: Query): Promise<PagedResult<AuthAuditEventEntity>> {
    try {
      const kind = typeof query.kind === 'string' ? query.kind.trim() : '';
      const q = typeof query.q === 'string' ? query.q.trim() : '';
      const limit = AuditAdminService.clampInt(query.limit, 100, 10, 300);

      const where: any = {};
      kind ? (where.kind = kind) : void 0;

      const cursor =
        typeof query.cursor === 'string' ? query.cursor.trim() : '';
      cursor ? (where.createdAt = { $lt: cursor }) : void 0;

      const qLower = q.toLowerCase();
      const looksEmail =
        qLower.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(qLower);

      const actorUserId =
        typeof query.actorUserId === 'string' ? query.actorUserId.trim() : '';
      const targetUserId =
        typeof query.targetUserId === 'string' ? query.targetUserId.trim() : '';

      actorUserId ? (where.actorUserId = actorUserId) : void 0;
      targetUserId ? (where.targetUserId = targetUserId) : void 0;

      looksEmail
        ? (where.$or = [
            { actorEmail: { $regex: q, $options: 'i' } },
            { actorEmailMasked: { $regex: q, $options: 'i' } },
            { targetEmail: { $regex: q, $options: 'i' } },
            { targetEmailMasked: { $regex: q, $options: 'i' } },
          ])
        : void 0;

      const rows = await this.repo.find({
        where,
        order: { createdAt: 'DESC' } as any,
        take: limit,
      } as any);

      const nextCursor = rows.length
        ? rows[rows.length - 1].createdAt || null
        : null;
      return { items: rows, nextCursor };
    } catch (error) {
      this.logger.error('Error listing audit events:', error);
      throw error;
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

  private static sha256(v: string): string {
    return createHash('sha256').update(v).digest('hex');
  }
}
