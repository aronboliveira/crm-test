import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import RbacService from '../../rbac/rbac.service';
import type { RoleKey } from '../../../types/permissions';
import type { AuthJwtPayload } from '../types/auth-jwt-payload.types';
import type UserEntity from '../../../entities/UserEntity';

/** Fields that must NEVER leak into the JWT response. */
const SENSITIVE_FIELDS = [
  'passwordHash',
  'twoFactorSecret',
  'twoFactorTempSecret',
  'twoFactorRecoveryCodes',
] as const;

export interface TokenResult {
  accessToken: string;
  user: Record<string, any>;
}

/**
 * Single-Responsibility helper that encapsulates the recurring pattern of
 * "resolve RBAC → build JWT → strip sensitive fields".
 *
 * Both `AuthService` (local login) and `OAuthService` (SSO login) delegate
 * to this class so the logic is defined exactly once (DRY).
 */
@Injectable()
export default class TokenIssuer {
  private readonly logger = new Logger(TokenIssuer.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly rbac: RbacService,
  ) {}

  /**
   * Build a signed JWT for the given user entity and return a sanitised
   * user object alongside the access token.
   */
  async issue(user: UserEntity): Promise<TokenResult> {
    const roles: RoleKey[] =
      ((user as any).roles as RoleKey[])?.length > 0
        ? ((user as any).roles as RoleKey[])
        : (['viewer'] as RoleKey[]);

    const perms = await this.rbac.resolvePermissions(roles);

    const payload: AuthJwtPayload = {
      sub: String(user._id),
      email: user.email,
      role: roles[0] || 'viewer',
      perms: perms as string[],
      tv:
        typeof (user as any).tokenVersion === 'number'
          ? (user as any).tokenVersion
          : 1,
    };

    const raw: Record<string, any> = (user as any)._doc ?? user;
    const safeUser = TokenIssuer.stripSensitive(raw);

    return { accessToken: this.jwt.sign(payload), user: safeUser };
  }

  /** Remove sensitive keys from a raw user document. */
  static stripSensitive(raw: Record<string, any>): Record<string, any> {
    const clone = { ...raw };
    for (const key of SENSITIVE_FIELDS) {
      delete clone[key];
    }
    return clone;
  }
}
