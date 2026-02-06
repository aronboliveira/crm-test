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

  private static normEmail(v: string | null): string {
    const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
    return s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : '';
  }

  private static maskEmail(email: string): string {
    const at = email.indexOf('@');
    if (at <= 0) return '***';
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);

    const l2 = local.length <= 2 ? local : local.slice(0, 2);
    const dParts = domain.split('.');
    const head = dParts[0] || '';
    const tail = dParts.length > 1 ? dParts[dParts.length - 1] : '';
    const h1 = head ? head.slice(0, 1) : '';
    const maskedDomain = tail ? `${h1}***.${tail}` : `${h1}***`;

    return `${l2}***@${maskedDomain}`;
  }

  private static sha256(v: string): string {
    return createHash('sha256').update(v).digest('hex');
  }

  private static jsonSafe<T extends object>(v: T): T {
    try {
      return JSON.parse(JSON.stringify(v)) as T;
    } catch {
      return {} as T;
    }
  }
}
