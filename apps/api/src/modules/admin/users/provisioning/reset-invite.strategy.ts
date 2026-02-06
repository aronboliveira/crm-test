import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';

import PasswordResetRequestEntity from '../../../../entities/PasswordResetRequestEntity';
import type {
  ProvisioningResult,
  UserProvisioningStrategy,
} from '../types/user-provisioning.types';

@Injectable()
export default class ResetInviteStrategy implements UserProvisioningStrategy {
  private readonly logger = new Logger(ResetInviteStrategy.name);
  private static readonly TTL_MS = 30 * 60_000;

  constructor(
    @InjectRepository(PasswordResetRequestEntity)
    private readonly repo: MongoRepository<PasswordResetRequestEntity>,
  ) {
    try {
      if (!repo) {
        this.logger.error('Repository not injected');
        throw new Error('Repository initialization failed');
      }
      this.logger.log('ResetInviteStrategy initialized');
    } catch (error) {
      this.logger.error('ResetInviteStrategy constructor error:', error);
      throw error;
    }
  }

  canHandle(kind: string): boolean {
    try {
      return (
        String(kind || '')
          .trim()
          .toLowerCase() === 'reset_invite'
      );
    } catch (error) {
      this.logger.error('Error in canHandle:', error);
      return false;
    }
  }

  async provision(args: {
    email: string;
    ip?: string;
    ua?: string;
    data?: { series?: number };
  }): Promise<ProvisioningResult> {
    try {
      const email = String(args.email || '')
        .trim()
        .toLowerCase();
      const series = Number(args.data?.series);

      if (!email || !Number.isFinite(series) || series < 1) {
        this.logger.warn('Invalid email or series for provisioning');
        return { ok: false, expiresAt: null, token: null };
      }

      const nowIso = new Date().toISOString();
      const expiresAt = new Date(
        Date.now() + ResetInviteStrategy.TTL_MS,
      ).toISOString();

      const token = randomBytes(32).toString('base64url');
      const tokenHash = ResetInviteStrategy.sha256(token);

      try {
        await this.repo.save({
          email,
          tokenHash,
          series,
          createdAt: nowIso,
          expiresAt,
          ipHash: args.ip
            ? ResetInviteStrategy.sha256(String(args.ip))
            : undefined,
          userAgent: args.ua || undefined,
        } as any);
      } catch (saveError) {
        this.logger.error('Error saving reset request:', saveError);
        return { ok: false, expiresAt: null, token: null };
      }

      return { ok: true, expiresAt, token };
    } catch (error) {
      this.logger.error('Error in provision:', error);
      return { ok: false, expiresAt: null, token: null };
    }
  }

  private static sha256(v: string): string {
    return createHash('sha256').update(v).digest('hex');
  }
}
