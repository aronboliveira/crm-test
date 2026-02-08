import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { createHash, randomBytes } from 'crypto';

import UserEntity from '../../../entities/UserEntity';
import PasswordResetRequestEntity from '../../../entities/PasswordResetRequestEntity';
import AuthAuditEventEntity from '../../../entities/AuthAuditEventEntity';

import AuthAuditService from '../../audit/auth-audit.service';
import RolePermissionsRegistry from '../role-permissions.registry';
import PasswordHashService from 'src/modules/auth/passowrd-hash.service';
import UserProvisioningService from './user-provisioning.service';
import EmailDeliveryService from 'src/modules/notifications/email-delivery.service';
import { Actor, RequestCtx } from './types/admin-user.types';

interface CreateUserBody {
  email?: unknown;
  username?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  department?: unknown;
  roleKey?: unknown;
}

interface SetRoleBody {
  roleKey?: unknown;
}

interface LockBody {
  reason?: unknown;
}

interface CreatePasswordBody {
  token?: unknown;
  password?: unknown;
}

function sha256(input: string): string {
  try {
    return createHash('sha256').update(input).digest('hex');
  } catch (error) {
    throw new BadRequestException('Hash generation failed');
  }
}

@Injectable()
export default class UserAdminService {
  private readonly logger = new Logger(UserAdminService.name);
  private static IDX_READY = false;
  private static readonly EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9._-]{2,29}$/;
  private static readonly NAME_RE = /^[\p{L}\s'-]{2,60}$/u;
  private static readonly PHONE_RE = /^\+?[0-9\s()-]{7,20}$/;
  private static readonly DEPARTMENT_RE = /^[\p{L}\p{N}\s&/.,()-]{2,80}$/u;

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: MongoRepository<UserEntity>,
    @InjectRepository(PasswordResetRequestEntity)
    private readonly resetRepo: MongoRepository<PasswordResetRequestEntity>,
    @InjectRepository(AuthAuditEventEntity)
    private readonly auditRepo: MongoRepository<AuthAuditEventEntity>,
    private readonly audit: AuthAuditService,
    private readonly hasher: PasswordHashService,
    private readonly provisioning: UserProvisioningService,
    private readonly mail: EmailDeliveryService,
  ) {
    try {
      if (!usersRepo || !resetRepo || !auditRepo) {
        this.logger.error('One or more repositories not injected');
        throw new Error('Repository initialization failed');
      }
      if (!audit || !hasher || !provisioning || !mail) {
        this.logger.error('One or more services not injected');
        throw new Error('Service initialization failed');
      }
      this.logger.log('UserAdminService initialized');
    } catch (error) {
      this.logger.error('UserAdminService constructor error:', error);
      throw error;
    }
  }

  async createUser(
    actor: Actor,
    body: CreateUserBody,
    ctx: Readonly<{ ip?: string; ua?: string }>,
  ) {
    try {
      await this.#ensureEmailUniqueIndex();

      const email = UserAdminService.normEmail(body?.email);
      const roleKey = RolePermissionsRegistry.normalizeRoleKey(body?.roleKey);

      if (!email) {
        this.logger.warn('Invalid email provided for user creation');
        throw new BadRequestException('Invalid email');
      }

      // Username validation
      const username = typeof body?.username === 'string' ? body.username.trim() : '';
      if (username && !UserAdminService.USERNAME_RE.test(username)) {
        throw new BadRequestException('Invalid username format');
      }

      // Optional fields with regex validation
      const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
      if (firstName && !UserAdminService.NAME_RE.test(firstName)) {
        throw new BadRequestException('Invalid first name format');
      }

      const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
      if (lastName && !UserAdminService.NAME_RE.test(lastName)) {
        throw new BadRequestException('Invalid last name format');
      }

      const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
      if (phone && !UserAdminService.PHONE_RE.test(phone)) {
        throw new BadRequestException('Invalid phone format');
      }

      const department = typeof body?.department === 'string' ? body.department.trim() : '';
      if (department && !UserAdminService.DEPARTMENT_RE.test(department)) {
        throw new BadRequestException('Invalid department format');
      }

      const exists = await this.usersRepo.findOne({
        where: { email } as any,
      } as any);
      if (exists) {
        this.logger.warn(`Email already exists: ${email}`);
        throw new BadRequestException('Email already exists');
      }

      // Check username uniqueness if provided
      if (username) {
        const usernameExists = await this.usersRepo.findOne({
          where: { username } as any,
        } as any);
        if (usernameExists) {
          this.logger.warn(`Username already exists: ${username}`);
          throw new BadRequestException('Username already exists');
        }
      }

      const perms = RolePermissionsRegistry.perms(roleKey);
      const nowIso = new Date().toISOString();

      const tmpPassword = UserAdminService.randPassword();
      const passwordHash = await this.hasher.hash(tmpPassword);

      const u = await this.usersRepo.save({
        email,
        username: username || email.split('@')[0],
        passwordHash,
        roleKey,
        perms,
        tokenVersion: 1,
        resetSeries: 1,
        passwordUpdatedAt: nowIso,
        passwordResetRequiredAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(phone ? { phone } : {}),
        ...(department ? { department } : {}),
      } as any);

      const savedUser = u as UserEntity;

      const invite = await this.provisioning.provision('reset_invite', {
        email,
        ip: ctx.ip,
        ua: ctx.ua,
        data: { series: 1 },
      });

      const target = { userId: String(savedUser._id), email };

      await this.audit.record(
        'admin.user.created',
        { userId: actor.userId, email: actor.email },
        target,
        { ip: ctx.ip, ua: ctx.ua },
        { roleKey },
      );

      const baseUrl = String(
        process.env.PUBLIC_APP_URL || 'http://localhost:5173',
      ).replace(/\/+$/, '');
      const resetUrl =
        invite.ok && invite.token
          ? `${baseUrl}/reset-password?token=${encodeURIComponent(invite.token)}`
          : '';

      const delivered =
        invite.ok && resetUrl
          ? await this.mail.send({
              to: email,
              kind: 'password_invite',
              subject: 'Set your password',
              text: `Open: ${resetUrl}`,
              html: `<p>Open:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
              meta: { expiresAt: invite.expiresAt, resetUrl },
            })
          : { ok: false, deliveryId: null };

      if (delivered.ok) {
        await this.audit.record(
          'admin.user.invite_issued',
          { userId: actor.userId, email: actor.email },
          target,
          { ip: ctx.ip, ua: ctx.ua },
          { expiresAt: invite.expiresAt, deliveryId: delivered.deliveryId },
        );
      }

      const expose =
        String(process.env.MOCK_INVITE_EXPOSE_URL || '').trim() === '1'
          ? true
          : String(process.env.NODE_ENV || '').toLowerCase() !== 'production';

      return {
        ok: true,
        user: { id: String(savedUser._id), email, roleKey, perms },
        invite: {
          ok: invite.ok,
          expiresAt: invite.expiresAt,
          deliveryId: delivered.deliveryId,
          resetUrl: expose ? resetUrl : null,
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  async list(query: any) {
    try {
      const limit = UserAdminService.clampInt(query?.limit, 50, 10, 300);
      const skip = UserAdminService.clampInt(query?.skip, 0, 0, 10000);

      const where: any = {};
      const q = typeof query?.q === 'string' ? query.q.trim() : '';
      if (q) {
        where.$or = [
          { email: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
        ];
      }

      const users = await this.usersRepo.find({
        where,
        skip,
        take: limit,
        order: { createdAt: 'DESC' } as any,
      } as any);

      return { items: users, total: users.length };
    } catch (error) {
      this.logger.error('Error listing users:', error);
      throw error;
    }
  }

  async details(id: string) {
    try {
      const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
      if (!oid) throw new BadRequestException('Invalid id');

      const userFound = await this.usersRepo.findOne({
        where: { _id: oid } as any,
      });
      if (!userFound) throw new NotFoundException('User not found');

      return userFound;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(`Error getting user details for ${id}:`, error);
      throw error;
    }
  }

  async setRole(actor: Actor, id: string, roleKey: unknown, ctx: RequestCtx) {
    try {
      const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
      if (!oid) throw new BadRequestException('Invalid id');

      const userFound = await this.usersRepo.findOne({
        where: { _id: oid } as any,
      });
      if (!userFound) throw new NotFoundException('User not found');

      const normalizedRole = RolePermissionsRegistry.normalizeRoleKey(roleKey);
      const perms = RolePermissionsRegistry.perms(normalizedRole);

      await this.usersRepo.update(
        oid as any,
        {
          roleKey: normalizedRole,
          perms,
          updatedAt: new Date().toISOString(),
        } as any,
      );

      await this.audit.record(
        'admin.user.role_updated',
        { userId: actor.userId, email: actor.email },
        { userId: id, email: (userFound as any).email },
        { ip: ctx.ip, ua: ctx.ua },
        { oldRole: (userFound as any).roleKey, newRole: normalizedRole },
      );

      return { ok: true, roleKey: normalizedRole, perms };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(`Error setting role for user ${id}:`, error);
      throw error;
    }
  }

  async forceReset(actor: Actor, id: string, ctx: RequestCtx) {
    try {
      const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
      if (!oid) throw new BadRequestException('Invalid id');

      const userFound = await this.usersRepo.findOne({
        where: { _id: oid } as any,
      });
      if (!userFound) throw new NotFoundException('User not found');

      const nowIso = new Date().toISOString();
      await this.usersRepo.update(
        oid as any,
        {
          passwordResetRequiredAt: nowIso,
          tokenVersion: Number((userFound as any).tokenVersion || 1) + 1,
          updatedAt: nowIso,
        } as any,
      );

      await this.audit.record(
        'admin.user.force_reset',
        { userId: actor.userId, email: actor.email },
        { userId: id, email: (userFound as any).email },
        { ip: ctx.ip, ua: ctx.ua },
        {},
      );

      return { ok: true };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(`Error forcing reset for user ${id}:`, error);
      throw error;
    }
  }

  async lockUser(actor: Actor, id: string, reason: unknown, ctx: RequestCtx) {
    try {
      const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
      if (!oid) throw new BadRequestException('Invalid id');

      const userFound = await this.usersRepo.findOne({
        where: { _id: oid } as any,
      });
      if (!userFound) throw new NotFoundException('User not found');

      const lockReason = typeof reason === 'string' ? reason.trim() : '';
      const nowIso = new Date().toISOString();

      await this.usersRepo.update(
        oid as any,
        {
          lockedAt: nowIso,
          lockReason,
          updatedAt: nowIso,
        } as any,
      );

      await this.audit.record(
        'admin.user.locked',
        { userId: actor.userId, email: actor.email },
        { userId: id, email: (userFound as any).email },
        { ip: ctx.ip, ua: ctx.ua },
        { reason: lockReason },
      );

      return { ok: true };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(`Error locking user ${id}:`, error);
      throw error;
    }
  }

  async unlockUser(actor: Actor, id: string, ctx: RequestCtx) {
    try {
      const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
      if (!oid) throw new BadRequestException('Invalid id');

      const userFound = await this.usersRepo.findOne({
        where: { _id: oid } as any,
      });
      if (!userFound) throw new NotFoundException('User not found');

      await this.usersRepo.update(
        oid as any,
        {
          lockedAt: undefined,
          lockReason: undefined,
          updatedAt: new Date().toISOString(),
        } as any,
      );

      await this.audit.record(
        'admin.user.unlocked',
        { userId: actor.userId, email: actor.email },
        { userId: id, email: (userFound as any).email },
        { ip: ctx.ip, ua: ctx.ua },
        {},
      );

      return { ok: true };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(`Error unlocking user ${id}:`, error);
      throw error;
    }
  }

  async reissueInvite(actor: Actor, id: string, ctx: RequestCtx) {
    try {
      const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
      if (!oid) throw new BadRequestException('Invalid id');

      const userFound = await this.usersRepo.findOne({
        where: { _id: oid } as any,
      });
      if (!userFound) throw new NotFoundException('Not found');

      const userEmail = String((userFound as any).email || '')
        .trim()
        .toLowerCase();
      if (!userEmail) {
        throw new BadRequestException('User email invalid');
      }

      const maxPerHour = UserAdminService.clampInt(
        process.env.INVITE_MAX_PER_HOUR,
        3,
        1,
        20,
      );
      const cutoffIso = new Date(Date.now() - 60 * 60_000).toISOString();

      const recent = await this.resetRepo.count({
        where: {
          email: userEmail,
          createdAt: { $gte: cutoffIso } as any,
        } as any,
      } as any);
      if (recent >= maxPerHour) {
        throw new BadRequestException('Invite rate limit exceeded');
      }

      const currentSeries = Number((userFound as any).resetSeries || 1);
      const nextSeries =
        Number.isFinite(currentSeries) && currentSeries >= 1
          ? currentSeries + 1
          : 2;

      await this.usersRepo.update(
        oid as any,
        {
          resetSeries: nextSeries,
          updatedAt: new Date().toISOString(),
        } as any,
      );

      const invite = await this.provisioning.provision('reset_invite', {
        email: userEmail,
        ip: ctx.ip,
        ua: ctx.ua,
        data: { series: nextSeries },
      });

      if (!invite.ok || !invite.token) {
        throw new BadRequestException('Failed to issue invite');
      }

      const baseUrl = String(
        process.env.PUBLIC_APP_URL || 'http://localhost:5173',
      ).replace(/\/+$/, '');
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(invite.token)}`;

      const delivered = await this.mail.send({
        to: userEmail,
        kind: 'password_invite',
        subject: 'Set your password',
        text: `Open: ${resetUrl}`,
        html: `<p>Open:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
        meta: { expiresAt: invite.expiresAt, resetUrl, series: nextSeries },
      });

      await this.audit.record(
        'admin.user.invite_reissued',
        { userId: actor.userId, email: actor.email },
        { userId: String(userFound._id), email: userEmail },
        { ip: ctx.ip, ua: ctx.ua },
        {
          expiresAt: invite.expiresAt,
          deliveryId: delivered.deliveryId,
          series: nextSeries,
        },
      );

      const expose =
        String(process.env.MOCK_INVITE_EXPOSE_URL || '').trim() === '1'
          ? true
          : String(process.env.NODE_ENV || '').toLowerCase() !== 'production';

      return {
        ok: true,
        invite: {
          ok: true,
          expiresAt: invite.expiresAt,
          deliveryId: delivered.deliveryId,
          resetUrl: expose ? resetUrl : null,
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(`Error reissuing invite for user ${id}:`, error);
      throw error;
    }
  }

  async checkDuplicate(email?: string, username?: string) {
    try {
      const result: { emailExists: boolean; usernameExists: boolean } = {
        emailExists: false,
        usernameExists: false,
      };

      if (email) {
        const normEmail = UserAdminService.normEmail(email);
        if (normEmail) {
          const found = await this.usersRepo.findOne({
            where: { email: normEmail } as any,
          } as any);
          result.emailExists = !!found;
        }
      }

      if (username) {
        const normUsername = String(username).trim();
        if (normUsername) {
          const found = await this.usersRepo.findOne({
            where: { username: normUsername } as any,
          } as any);
          result.usernameExists = !!found;
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Error checking duplicate:', error);
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

  async #ensureEmailUniqueIndex(): Promise<void> {
    if (UserAdminService.IDX_READY) return;
    UserAdminService.IDX_READY = true;

    try {
      // best-effort; ignore if collection already has similar index
      await (this.usersRepo as any).createCollectionIndex(
        { email: 1 },
        { unique: true, name: 'ux_users_email' },
      );
    } catch {
      void 0;
    }
  }

  private static normEmail(v: unknown): string {
    const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
    return s && UserAdminService.EMAIL_RE.test(s) ? s : '';
  }

  private static randPassword(): string {
    const a = randomBytes(9).toString('base64url');
    return `Tmp#${a}9A`;
  }
}
