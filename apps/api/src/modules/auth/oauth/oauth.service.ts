import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import UserEntity, {
  type OAuthLinkedAccount,
} from '../../../entities/UserEntity';
import TokenIssuer, { type TokenResult } from '../token/token-issuer.service';
import type { OAuthProfile } from './oauth-profile';
import {
  googleOAuthConfig,
  microsoftOAuthConfig,
  nextcloudOAuthConfig,
} from './oauth.config';

export type { OAuthProfile };

/**
 * Orchestrates the OAuth "find-or-create" flow:
 *
 * 1. Try to find a user whose `oauthAccounts` array already contains a
 *    matching `{ provider, providerId }` pair → login that user.
 * 2. Otherwise fall back to e-mail matching:
 *    - if a local user with the same e-mail exists, *link* the OAuth
 *      provider to that account and issue a token.
 *    - if no user exists at all, auto-provision a new account with the
 *      "viewer" role and issue a token.
 *
 * Token issuance is delegated to the shared `TokenIssuer` (SRP / DRY).
 */
@Injectable()
export default class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly tokenIssuer: TokenIssuer,
    @InjectRepository(UserEntity)
    private readonly usersRepo: MongoRepository<UserEntity>,
  ) {
    this.logger.log('OAuthService initialised');
  }

  /* ────────────────── public API ────────────────── */

  /**
   * Public metadata for frontend login buttons so the UI can disable
   * providers that are not configured server-side.
   */
  getProviderAvailability(): ReadonlyArray<{
    provider: 'google' | 'microsoft' | 'nextcloud';
    enabled: boolean;
    reason?: string;
  }> {
    const google = googleOAuthConfig();
    const microsoft = microsoftOAuthConfig();
    const nextcloud = nextcloudOAuthConfig();

    return [
      {
        provider: 'google',
        enabled: !!(google.clientID && google.clientSecret),
        reason:
          google.clientID && google.clientSecret
            ? undefined
            : 'Google SSO indisponível no momento',
      },
      {
        provider: 'microsoft',
        enabled: !!(microsoft.clientID && microsoft.clientSecret),
        reason:
          microsoft.clientID && microsoft.clientSecret
            ? undefined
            : 'Microsoft SSO indisponível no momento',
      },
      {
        provider: 'nextcloud',
        enabled: !!(nextcloud.clientID && nextcloud.clientSecret),
        reason:
          nextcloud.clientID && nextcloud.clientSecret
            ? undefined
            : 'NextCloud SSO indisponível no momento',
      },
    ];
  }

  /**
   * Main entry-point called from the OAuth controller after Passport
   * verifies the provider token.  Returns `{ accessToken, user }` exactly
   * like the local `AuthService.login()` method so the frontend can handle
   * both flows identically.
   */
  async findOrCreateAndLogin(profile: OAuthProfile): Promise<TokenResult> {
    const now = new Date().toISOString();

    /* 1 — lookup by provider + providerId (existing link) */
    let user = await this.findByOAuthLink(profile.provider, profile.providerId);

    if (user) {
      await this.touchOAuthLink(user, profile, now);
      return this.tokenIssuer.issue(user);
    }

    /* 2 — fall back to email match */
    if (profile.email) {
      user = await this.usersRepo.findOne({
        where: { email: profile.email.toLowerCase() } as any,
      });

      if (user) {
        if ((user as any).disabled) {
          throw new UnauthorizedException('Account is disabled');
        }
        await this.addOAuthLink(user, profile, now);
        return this.tokenIssuer.issue(user);
      }
    }

    /* 3 — auto-provision */
    user = await this.provisionUser(profile, now);
    return this.tokenIssuer.issue(user);
  }

  /**
   * Returns the list of linked OAuth providers for a given userId.
   */
  async getLinkedProviders(userId: string): Promise<
    ReadonlyArray<{
      provider: string;
      email?: string;
      linkedAt: string;
      lastUsedAt?: string;
    }>
  > {
    const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
    if (!oid) return [];
    const user = await this.usersRepo.findOne({ where: { _id: oid } as any });
    if (!user) return [];
    return (user.oauthAccounts || []).map((a) => ({
      provider: a.provider,
      email: a.email,
      linkedAt: a.linkedAt,
      lastUsedAt: a.lastUsedAt,
    }));
  }

  /**
   * Unlink a previously linked OAuth provider.
   * Prevents unlinking the *last* auth method (the user must always have
   * at least a password OR at least one remaining OAuth link).
   */
  async unlinkProvider(
    userId: string,
    provider: OAuthLinkedAccount['provider'],
  ): Promise<{ ok: boolean }> {
    const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
    if (!oid) throw new UnauthorizedException('Invalid user');

    const user = await this.usersRepo.findOne({ where: { _id: oid } as any });
    if (!user) throw new UnauthorizedException('User not found');

    const accounts = Array.isArray(user.oauthAccounts)
      ? [...user.oauthAccounts]
      : [];
    const idx = accounts.findIndex((a) => a.provider === provider);
    if (idx < 0) return { ok: true }; // nothing to unlink

    const hasPassword = !!(user as any).passwordHash;
    if (!hasPassword && accounts.length <= 1) {
      throw new ConflictException(
        'Cannot unlink the only authentication method. Set a password first.',
      );
    }

    accounts.splice(idx, 1);
    await this.usersRepo.update(
      { _id: oid } as any,
      { oauthAccounts: accounts, updatedAt: new Date().toISOString() } as any,
    );

    return { ok: true };
  }

  /* ────────────────── private helpers ────────────────── */

  private async findByOAuthLink(
    provider: string,
    providerId: string,
  ): Promise<UserEntity | null> {
    // MongoDB $elemMatch for embedded array
    return this.usersRepo.findOne({
      where: {
        'oauthAccounts.provider': provider,
        'oauthAccounts.providerId': providerId,
      } as any,
    });
  }

  private async touchOAuthLink(
    user: UserEntity,
    profile: OAuthProfile,
    now: string,
  ): Promise<void> {
    const accounts = (user.oauthAccounts || []).map((a) =>
      a.provider === profile.provider && a.providerId === profile.providerId
        ? {
            ...a,
            lastUsedAt: now,
            email: profile.email || a.email,
            displayName: profile.displayName || a.displayName,
            avatarUrl: profile.avatarUrl || a.avatarUrl,
          }
        : a,
    );
    await this.usersRepo.update(
      { _id: user._id } as any,
      { oauthAccounts: accounts, updatedAt: now } as any,
    );
  }

  private async addOAuthLink(
    user: UserEntity,
    profile: OAuthProfile,
    now: string,
  ): Promise<void> {
    const accounts = [...(user.oauthAccounts || [])];

    // Guard against double-linking the same provider
    const existing = accounts.find(
      (a) =>
        a.provider === profile.provider && a.providerId === profile.providerId,
    );
    if (existing) {
      existing.lastUsedAt = now;
      existing.email = profile.email || existing.email;
      existing.displayName = profile.displayName || existing.displayName;
    } else {
      accounts.push({
        provider: profile.provider,
        providerId: profile.providerId,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        linkedAt: now,
        lastUsedAt: now,
      });
    }

    await this.usersRepo.update(
      { _id: user._id } as any,
      { oauthAccounts: accounts, updatedAt: now } as any,
    );
  }

  private async provisionUser(
    profile: OAuthProfile,
    now: string,
  ): Promise<UserEntity> {
    const email = (profile.email || '').toLowerCase().trim();
    if (!email) {
      throw new UnauthorizedException(
        'OAuth provider did not return an e-mail address',
      );
    }

    // Double-check uniqueness (race guard)
    const dup = await this.usersRepo.findOne({
      where: { email } as any,
    });
    if (dup) {
      throw new ConflictException('A user with that e-mail already exists');
    }

    const username = email.split('@')[0] + '_' + Date.now().toString(36);

    const newUser = this.usersRepo.create({
      email,
      username,
      name: profile.displayName || username,
      firstName: (profile.displayName || '').split(' ')[0] || '',
      lastName: (profile.displayName || '').split(' ').slice(1).join(' ') || '',
      passwordHash: '', // no local password — OAuth-only until they set one
      tokenVersion: 1,
      roles: ['viewer'] as any,
      disabled: false,
      createdAt: now,
      updatedAt: now,
      avatarUrl: profile.avatarUrl || undefined,
      oauthAccounts: [
        {
          provider: profile.provider,
          providerId: profile.providerId,
          email: profile.email,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          linkedAt: now,
          lastUsedAt: now,
        },
      ],
    } as any);

    const saved = (await this.usersRepo.save(newUser)) as unknown as UserEntity;
    this.logger.log(`Provisioned OAuth user ${email} via ${profile.provider}`);
    return saved;
  }
}
