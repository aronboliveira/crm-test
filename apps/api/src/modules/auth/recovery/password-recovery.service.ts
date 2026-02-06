import {
  BadRequestException,
  Injectable,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

import UserEntity from '../../../entities/UserEntity';
import PasswordResetRequestEntity from '../../../entities/PasswordResetRequestEntity';
import type { ResetDeliveryPort } from './ports/reset-delivery.port';
import { RESET_DELIVERY_PORT } from './ports/reset-delivery.token';
import AuthAuditService from 'src/modules/audit/auth-audit.service';

type ForgotDto = Readonly<{ email: string }>;
type ResetDto = Readonly<{ token: string; password: string; confirm: string }>;

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export default class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);
  static readonly _HOUR_MS = 60 * 60_000;
  static readonly _TTL_MS = 30 * 60_000;
  static readonly _MAX_BY_EMAIL_PER_H = 3;
  static readonly _MAX_BY_IP_PER_H = 8;
  static readonly _CLEAN_USED_AFTER_MS = 7 * 24 * 60 * 60_000;

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: MongoRepository<UserEntity>,
    @InjectRepository(PasswordResetRequestEntity)
    private readonly reqRepo: MongoRepository<PasswordResetRequestEntity>,
    @Inject(RESET_DELIVERY_PORT) private readonly delivery: ResetDeliveryPort,
    private readonly audit: AuthAuditService,
  ) {
    try {
      if (!usersRepo || !reqRepo || !delivery || !audit) {
        this.logger.error('One or more dependencies not injected');
        throw new Error('Service initialization failed');
      }
      this.logger.log('PasswordRecoveryService initialized');
    } catch (error) {
      this.logger.error('PasswordRecoveryService constructor error:', error);
      throw error;
    }
  }

  async forgot(dto: ForgotDto, ipRaw: string, ua: string) {
    try {
      await this.#cleanup();
      const email = this.#normEmail(dto?.email);
      if (!email) return { ok: true };

      const now = Date.now();
      const ipHash = this.#sha256(ipRaw || '');
      const emailWindow = await this.#countRecentByEmail(
        email,
        now - PasswordRecoveryService._HOUR_MS,
      );
      const ipWindow = await this.#countRecentByIp(
        ipHash,
        now - PasswordRecoveryService._HOUR_MS,
      );

      if (
        emailWindow >= PasswordRecoveryService._MAX_BY_EMAIL_PER_H ||
        ipWindow >= PasswordRecoveryService._MAX_BY_IP_PER_H
      ) {
        this.logger.warn(`Rate limit exceeded for email: ${email}`);
        throw new BadRequestException('Too many requests');
      }

      const user = await this.usersRepo.findOne({ where: { email } as any });

      const token = this.#token();
      const tokenHash = this.#sha256(token);
      const nowIso = new Date(now).toISOString();
      const expIso = new Date(
        now + PasswordRecoveryService._TTL_MS,
      ).toISOString();

      await this.reqRepo.save({
        email,
        tokenHash,
        createdAt: nowIso,
        expiresAt: expIso,
        ipHash,
        userAgent: ua || undefined,
      } as any);

      await this.audit.record(
        'auth.password_reset.requested',
        null,
        { userId: user ? String((user as any)._id) : null, email },
        { ip: ipRaw, ua },
        { env: String(process.env.NODE_ENV || 'dev') },
      );

      const isProd =
        String(process.env.NODE_ENV || '').toLowerCase() === 'production';
      if (!user || isProd) return { ok: true };

      const r = await this.delivery.deliver({ email, token });
      return { ok: true, devResetToken: r.devToken };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error in forgot password:', error);
      throw error;
    }
  }

  async validate(token: string) {
    try {
      const tok = (token || '').trim();
      if (!tok) return { ok: false };

      const row = await this.reqRepo.findOne({
        where: { tokenHash: this.#sha256(tok) } as any,
      });
      if (!row) return { ok: false };

      const now = Date.now();
      const exp = Date.parse((row as any).expiresAt);
      const used = !!(row as any).usedAt;

      return !used && now <= exp
        ? { ok: true, email: (row as any).email }
        : { ok: false };
    } catch (error) {
      this.logger.error('Error validating reset token:', error);
      return { ok: false };
    }
  }

  async reset(dto: ResetDto) {
    try {
      await this.#cleanup();
      const token = (dto?.token || '').trim();
      const pass = String(dto?.password || '');
      const conf = String(dto?.confirm || '');

      if (!token) throw new BadRequestException('Invalid token');
      if (!this.#passwordOk(pass))
        throw new BadRequestException('Weak password');
      if (pass !== conf) throw new BadRequestException('Password mismatch');

      const tokenHash = this.#sha256(token);
      const row = await this.reqRepo.findOne({ where: { tokenHash } as any });
      if (!row) throw new BadRequestException('Invalid token');

      const now = Date.now();
      const exp = Date.parse((row as any).expiresAt);
      if ((row as any).usedAt || now > exp) {
        throw new BadRequestException('Expired token');
      }

      const user = await this.usersRepo.findOne({
        where: { email: (row as any).email } as any,
      });
      if (!user) throw new BadRequestException('Invalid token');

      const hash = await bcrypt.hash(pass, 12);

      const nowIso = new Date(now).toISOString();
      const tv =
        typeof (user as any).tokenVersion === 'number'
          ? (user as any).tokenVersion
          : 1;
      await this.usersRepo.update((user as any)._id, {
        passwordHash: hash,
        passwordUpdatedAt: nowIso,
        tokenVersion: tv + 1,
      } as any);

      await this.audit.record(
        'auth.password_reset.completed',
        null,
        { userId: String((user as any)._id), email: (user as any).email },
        { ip: '', ua: '' },
        { tokenUsed: true },
      );

      await this.reqRepo.update((row as any)._id, {
        usedAt: nowIso,
      } as any);

      return { ok: true };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error resetting password:', error);
      throw error;
    }
  }

  #normEmail(v: unknown): string {
    const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
    return s && emailRx.test(s) ? s : '';
  }

  #token(): string {
    return randomBytes(32).toString('base64url');
  }

  #sha256(v: string): string {
    return createHash('sha256').update(v).digest('hex');
  }

  #passwordOk(p: string): boolean {
    const s = String(p || '');
    if (s.length < 10) return false;
    const a = /[a-z]/.test(s);
    const b = /[A-Z]/.test(s);
    const c = /\d/.test(s);
    const d = /[^A-Za-z0-9]/.test(s);
    return a && b && c && d ? true : false;
  }

  async #countRecentByEmail(email: string, afterMs: number): Promise<number> {
    try {
      const afterIso = new Date(afterMs).toISOString();
      return await this.reqRepo.count({
        where: { email, createdAt: { $gte: afterIso } } as any,
      } as any);
    } catch (error) {
      this.logger.error('Error counting recent requests by email:', error);
      return 0;
    }
  }

  async #cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const expIso = new Date(now).toISOString();
      const usedCutIso = new Date(
        now - PasswordRecoveryService._CLEAN_USED_AFTER_MS,
      ).toISOString();

      await this.reqRepo.delete({ expiresAt: { $lt: expIso } as any } as any);
      await this.reqRepo.delete({
        usedAt: { $exists: true },
        createdAt: { $lt: usedCutIso },
      } as any);
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }

  async #countRecentByIp(ipHash: string, afterMs: number): Promise<number> {
    try {
      const afterIso = new Date(afterMs).toISOString();
      return await this.reqRepo.count({
        where: { ipHash, createdAt: { $gte: afterIso } } as any,
      } as any);
    } catch (error) {
      this.logger.error('Error counting recent requests by IP:', error);
      return 0;
    }
  }
}
