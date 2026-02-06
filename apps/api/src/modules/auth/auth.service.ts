import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import UsersService from '../users/users.service';
import RbacService from '../rbac/rbac.service';
import type { RoleKey } from '../../types/permissions';
import { AuthJwtPayload } from './types/auth-jwt-payload.types';

@Injectable()
export default class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly rbac: RbacService,
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

      const payload: AuthJwtPayload = {
        sub: String(user._id),
        email: user.email,
        role: user.roleKey || 'viewer',
        perms: user.perms || [],
        tv: typeof user.tokenVersion === 'number' ? user.tokenVersion : 1,
      };

      return { accessToken: this.jwt.sign(payload), user };
    } catch (error) {
      this.logger.error('Error creating login token:', error);
      throw error;
    }
  }
}
