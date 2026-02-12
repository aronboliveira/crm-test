import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { createHash } from 'crypto';
import AuthAuditEventEntity, {
  type AuditKind,
} from '../../entities/AuthAuditEventEntity';
import type { AuditActor, AuditTarget } from './types/audit.types';
import AuditPiiPolicy from './audit-pii.policy';

type Meta = Record<string, any> | null | undefined;

@Injectable()
export default class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  constructor(
    @InjectRepository(AuthAuditEventEntity)
    private readonly repo: MongoRepository<AuthAuditEventEntity>,
  ) {
    try {
      if (!repo) {
        this.logger.error('Repository not injected');
        throw new Error('Repository initialization failed');
      }
      this.logger.log('AuthAuditService initialized');
    } catch (error) {
      this.logger.error('AuthAuditService constructor error:', error);
      throw error;
    }
  }

  async record(
    kind: AuditKind,
    actor: AuditActor | null,
    target: AuditTarget | null,
    ctx: Readonly<{ ip?: string; ua?: string }>,
    meta?: Meta,
  ): Promise<void> {
    try {
      const createdAt = new Date().toISOString();
      const ipHash = ctx.ip
        ? AuthAuditService.sha256(String(ctx.ip))
        : undefined;

      const mode = AuditPiiPolicy.mode();

      const actorEmail = actor?.email ? String(actor.email) : '';
      const targetEmail = target?.email ? String(target.email) : '';

      const actorMasked = actorEmail
        ? AuditPiiPolicy.maskEmail(actorEmail)
        : undefined;
      const targetMasked = targetEmail
        ? AuditPiiPolicy.maskEmail(targetEmail)
        : undefined;

      const actorHash = actorEmail
        ? AuditPiiPolicy.hashEmail(actorEmail)
        : undefined;
      const targetHash = targetEmail
        ? AuditPiiPolicy.hashEmail(targetEmail)
        : undefined;

      const safeMeta = meta && typeof meta === 'object' ? meta : undefined;

      await this.repo.save({
        kind,
        createdAt,
        actorUserId: actor?.userId || undefined,
        actorEmail: mode === 'full' && actorEmail ? actorEmail : undefined,
        actorEmailMasked: actorMasked,
        actorEmailHash: actorHash,

        targetUserId: target?.userId || undefined,
        targetEmail: mode === 'full' && targetEmail ? targetEmail : undefined,
        targetEmailMasked: targetMasked,
        targetEmailHash: targetHash,

        ipHash,
        userAgent: ctx.ua || undefined,
        meta: safeMeta,
      } as any);
    } catch (error) {
      this.logger.error(`Error recording audit event ${kind}:`, error);
      throw error;
    }
  }

  private static sha256(v: string): string {
    return createHash('sha256').update(v).digest('hex');
  }
}
