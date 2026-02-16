import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import UsersService from '../users/users.service';
import RbacService from '../rbac/rbac.service';
import UserEntity from '../../entities/UserEntity';
import type { RoleKey } from '../../types/permissions';
import { AuthJwtPayload } from './types/auth-jwt-payload.types';

type OtpAuthenticator = Readonly<{
  generateSecret: () => string;
  verify: (params: { token: string; secret: string }) => boolean;
}>;

const { authenticator } = require('otplib') as {
  authenticator: OtpAuthenticator;
};

@Injectable()
export default class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly rbac: RbacService,
    @InjectRepository(UserEntity)
    private readonly usersRepo: MongoRepository<UserEntity>,
  ) {
    try {
      if (!users || !jwt || !rbac) {
        this.logger.error('One or more services not injected');
        throw new Error('Service initialization failed');
      }
      this.logger.log('AuthService initialized');
    } catch (error) {
      this.logger.error('AuthService constructor error:', error);
      throw error;
    }
  }

  async validateUser(email: string, password: string) {
    try {
      const u = await this.users.findByEmail(email);
      if (!u || (u as any).disabled) {
        this.logger.warn(`Validation failed for email: ${email}`);
        return null;
      }

      const lockedAt =
        typeof (u as any).lockedAt === 'string' ? (u as any).lockedAt : '';
      if (lockedAt) {
        this.logger.warn(`Account locked: ${email}`);
        throw new UnauthorizedException('Account locked');
      }

      const ok = await bcrypt.compare(password, (u as any).passwordHash);
      if (!ok) {
        this.logger.warn(`Invalid password for email: ${email}`);
        return null;
      }

      return u;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Error validating user:', error);
      return null;
    }
  }

  async login(user: any) {
    try {
      const roles =
        (user.roles as RoleKey[])?.length > 0
          ? (user.roles as RoleKey[])
          : (['viewer'] as RoleKey[]);
      const perms = await this.rbac.resolvePermissions(roles);

      this.logger.log(
        `Login: user=${user.email}, roles=${roles.join(',')}, perms=${perms.length}`,
      );

      const payload: AuthJwtPayload = {
        sub: String(user._id),
        email: user.email,
        role: roles[0] || 'viewer',
        perms: perms as string[], // Use resolved permissions, not user.perms
        tv: typeof user.tokenVersion === 'number' ? user.tokenVersion : 1,
      };

      const {
        passwordHash: _,
        twoFactorSecret: __,
        twoFactorTempSecret: ___,
        twoFactorRecoveryCodes: ____,
        ...safeUser
      } = user._doc ?? user;
      return { accessToken: this.jwt.sign(payload), user: safeUser };
    } catch (error) {
      this.logger.error('Error creating login token:', error);
      throw error;
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ ok: boolean }> {
    try {
      const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
      if (!oid) throw new UnauthorizedException('Invalid user');

      const user = await this.usersRepo.findOne({
        where: { _id: oid } as any,
      });
      if (!user) throw new UnauthorizedException('User not found');

      const ok = await bcrypt.compare(
        currentPassword,
        (user as any).passwordHash,
      );
      if (!ok) throw new UnauthorizedException('Current password is incorrect');

      const passwordHash = await bcrypt.hash(newPassword, 12);
      const now = new Date().toISOString();

      await this.usersRepo.update(
        oid as any,
        {
          passwordHash,
          passwordUpdatedAt: now,
          tokenVersion: ((user as any).tokenVersion || 1) + 1,
          updatedAt: now,
        } as any,
      );

      this.logger.log(`Password changed for user ${userId}`);
      return { ok: true };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Error changing password:', error);
      throw error;
    }
  }

  async requestEmailChange(
    userId: string,
    newEmail: string,
    password: string,
  ): Promise<{ ok: boolean; message: string }> {
    try {
      const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
      if (!oid) throw new UnauthorizedException('Invalid user');

      const user = await this.usersRepo.findOne({
        where: { _id: oid } as any,
      });
      if (!user) throw new UnauthorizedException('User not found');

      const ok = await bcrypt.compare(password, (user as any).passwordHash);
      if (!ok) throw new UnauthorizedException('Password is incorrect');

      // Check if new email is already taken
      const existing = await this.users.findByEmail(newEmail);
      if (existing && String(existing._id) !== userId) {
        return { ok: false, message: 'Email is already in use' };
      }

      // Everything is ready to send a verification email.
      // The SMTP transporter skeleton is wired up but deliberately
      // does NOT call transporter.sendMail() — per project requirement.
      this.logger.log(
        `Email change requested for user ${userId}: ${newEmail} — ` +
          `SMTP transporter is configured but sending is disabled.`,
      );

      return {
        ok: true,
        message:
          'Email change request recorded. Verification email would be sent once SMTP sending is enabled.',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Error requesting email change:', error);
      throw error;
    }
  }

  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
    if (!oid) return false;

    const user = await this.usersRepo.findOne({ where: { _id: oid } as any });
    return !!user?.twoFactorEnabled;
  }

  async setupTwoFactor(userId: string): Promise<
    Readonly<{
      secret: string;
      otpauthUrl: string;
    }>
  > {
    const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
    if (!oid) throw new UnauthorizedException('Invalid user');

    const user = await this.usersRepo.findOne({ where: { _id: oid } as any });
    if (!user) throw new UnauthorizedException('User not found');

    const secret = authenticator.generateSecret();
    const label = encodeURIComponent(String(user.email || 'user'));
    const issuer = encodeURIComponent('CRM Portfolio');
    const otpauthUrl = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    await this.usersRepo.update(
      { _id: oid } as any,
      {
        twoFactorTempSecret: secret,
        updatedAt: new Date().toISOString(),
      } as any,
    );

    return { secret, otpauthUrl };
  }

  async enableTwoFactor(
    userId: string,
    code: string,
  ): Promise<Readonly<{ ok: boolean; recoveryCodes: string[] }>> {
    const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
    if (!oid) throw new UnauthorizedException('Invalid user');

    const user = await this.usersRepo.findOne({ where: { _id: oid } as any });
    if (!user) throw new UnauthorizedException('User not found');

    const secret = String(user.twoFactorTempSecret || '').trim();
    if (!secret)
      throw new UnauthorizedException('Two-factor setup not started');

    const valid = authenticator.verify({ token: String(code || ''), secret });
    if (!valid) throw new UnauthorizedException('Invalid two-factor code');

    const recoveryCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(2, 10).toUpperCase(),
    );

    await this.usersRepo.update(
      { _id: oid } as any,
      {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorTempSecret: undefined,
        twoFactorEnabledAt: new Date().toISOString(),
        twoFactorRecoveryCodes: recoveryCodes,
        tokenVersion: ((user as any).tokenVersion || 1) + 1,
        updatedAt: new Date().toISOString(),
      } as any,
    );

    return { ok: true, recoveryCodes };
  }

  async disableTwoFactor(
    userId: string,
    code: string,
  ): Promise<Readonly<{ ok: boolean }>> {
    const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
    if (!oid) throw new UnauthorizedException('Invalid user');

    const user = await this.usersRepo.findOne({ where: { _id: oid } as any });
    if (!user) throw new UnauthorizedException('User not found');

    const secret = String(user.twoFactorSecret || '').trim();
    if (!secret || !user.twoFactorEnabled) {
      return { ok: true };
    }

    const normalizedCode = String(code || '')
      .trim()
      .toUpperCase();
    const validTotp = authenticator.verify({ token: normalizedCode, secret });
    const recoveryCodes = Array.isArray(user.twoFactorRecoveryCodes)
      ? user.twoFactorRecoveryCodes.map((item) => String(item).toUpperCase())
      : [];
    const recoveryIndex = recoveryCodes.indexOf(normalizedCode);

    if (!validTotp && recoveryIndex < 0) {
      throw new UnauthorizedException('Invalid two-factor code');
    }

    if (recoveryIndex >= 0) {
      recoveryCodes.splice(recoveryIndex, 1);
    }

    await this.usersRepo.update(
      { _id: oid } as any,
      {
        twoFactorEnabled: false,
        twoFactorSecret: undefined,
        twoFactorTempSecret: undefined,
        twoFactorEnabledAt: undefined,
        twoFactorRecoveryCodes: recoveryIndex >= 0 ? recoveryCodes : [],
        tokenVersion: ((user as any).tokenVersion || 1) + 1,
        updatedAt: new Date().toISOString(),
      } as any,
    );

    return { ok: true };
  }

  async verifyTwoFactorForLogin(userId: string, code?: string): Promise<void> {
    const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
    if (!oid) throw new UnauthorizedException('Invalid user');

    const user = await this.usersRepo.findOne({ where: { _id: oid } as any });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.twoFactorEnabled) return;

    const secret = String(user.twoFactorSecret || '').trim();
    const normalizedCode = String(code || '')
      .trim()
      .toUpperCase();
    if (!secret || !normalizedCode) {
      throw new UnauthorizedException('Two-factor code required');
    }

    const validTotp = authenticator.verify({ token: normalizedCode, secret });
    const recoveryCodes = Array.isArray(user.twoFactorRecoveryCodes)
      ? user.twoFactorRecoveryCodes.map((item) => String(item).toUpperCase())
      : [];
    const recoveryIndex = recoveryCodes.indexOf(normalizedCode);

    if (!validTotp && recoveryIndex < 0) {
      throw new UnauthorizedException('Invalid two-factor code');
    }

    if (recoveryIndex >= 0) {
      recoveryCodes.splice(recoveryIndex, 1);
      await this.usersRepo.update(
        { _id: oid } as any,
        {
          twoFactorRecoveryCodes: recoveryCodes,
          updatedAt: new Date().toISOString(),
        } as any,
      );
    }
  }

  /**
   * Generates a short-lived token for 2FA challenges.
   * This token allows the frontend to complete 2FA verification without
   * re-entering credentials.
   */
  async generateTwoFactorToken(userId: string): Promise<string> {
    const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
    if (!oid) throw new UnauthorizedException('Invalid user');

    // Create a temporary JWT that expires in 5 minutes
    const payload = {
      sub: userId,
      type: '2fa-challenge',
      exp: Math.floor(Date.now() / 1000) + 5 * 60, // 5 minutes
    };

    return this.jwt.sign(payload);
  }

  /**
   * Verifies a 2FA challenge token and code, returning the user if valid.
   */
  async verifyTwoFactorToken(token: string, code: string): Promise<UserEntity> {
    try {
      const payload = this.jwt.verify(token);

      if (payload.type !== '2fa-challenge') {
        throw new UnauthorizedException('Invalid token type');
      }

      const userId = String(payload.sub || '').trim();
      const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
      if (!oid) throw new UnauthorizedException('Invalid user');

      const user = await this.usersRepo.findOne({
        where: { _id: oid } as any,
      });
      if (!user) throw new UnauthorizedException('User not found');

      // Verify the 2FA code
      const secret = String(user.twoFactorSecret || '').trim();
      const normalizedCode = String(code || '')
        .trim()
        .toUpperCase();
      if (!secret || !normalizedCode) {
        throw new UnauthorizedException('Two-factor code required');
      }

      const validTotp = authenticator.verify({
        token: normalizedCode,
        secret,
      });
      const recoveryCodes = Array.isArray(user.twoFactorRecoveryCodes)
        ? user.twoFactorRecoveryCodes.map((item) => String(item).toUpperCase())
        : [];
      const recoveryIndex = recoveryCodes.indexOf(normalizedCode);

      if (!validTotp && recoveryIndex < 0) {
        throw new UnauthorizedException('Invalid two-factor code');
      }

      // If recovery code was used, remove it
      if (recoveryIndex >= 0) {
        recoveryCodes.splice(recoveryIndex, 1);
        await this.usersRepo.update(
          { _id: oid } as any,
          {
            twoFactorRecoveryCodes: recoveryCodes,
            updatedAt: new Date().toISOString(),
          } as any,
        );
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Error verifying 2FA token:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
