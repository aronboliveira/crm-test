import { Injectable, type Type } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { OAuthProviderKey } from '../oauth.constants';

/**
 * Factory that eliminates the 3-class copy-paste for OAuth guards.
 *
 * Each guard subclass only differs by the Passport strategy name and the
 * error message — so we generate them from a single factory (DRY + OCP).
 */
function createOAuthGuard(strategy: OAuthProviderKey): Type<any> {
  @Injectable()
  class OAuthGuardImpl extends AuthGuard(strategy) {
    handleRequest(err: any, user: any, _info: any) {
      if (err || !user) {
        throw err || new Error(`${strategy} OAuth failed`);
      }
      return user;
    }
  }

  // Give each generated class a unique name for debugging / DI metadata
  Object.defineProperty(OAuthGuardImpl, 'name', {
    value: `${strategy.charAt(0).toUpperCase() + strategy.slice(1)}OAuthGuard`,
  });

  return OAuthGuardImpl;
}

export const GoogleOAuthGuard = createOAuthGuard('google');
export const MicrosoftOAuthGuard = createOAuthGuard('microsoft');
export const NextcloudOAuthGuard = createOAuthGuard('nextcloud');
