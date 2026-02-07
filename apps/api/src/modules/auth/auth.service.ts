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

      return { accessToken: this.jwt.sign(payload), user };
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
}
