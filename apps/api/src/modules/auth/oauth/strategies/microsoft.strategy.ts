import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { microsoftOAuthConfig } from '../oauth.config';
import { normaliseOAuthProfile } from '../oauth-profile';

/**
 * Passport strategy for Microsoft Account / Azure AD / Entra ID.
 *
 * Works with personal Microsoft accounts (`common` tenant) as well as
 * organisation tenants when `OAUTH_MICROSOFT_TENANT_ID` is set.
 */
@Injectable()
export default class MicrosoftOAuthStrategy extends PassportStrategy(
  Strategy,
  'microsoft',
) {
  private readonly logger = new Logger(MicrosoftOAuthStrategy.name);

  constructor() {
    const cfg = microsoftOAuthConfig();
    super({
      clientID: cfg.clientID || 'NOT_CONFIGURED',
      clientSecret: cfg.clientSecret || 'NOT_CONFIGURED',
      callbackURL: cfg.callbackURL,
      tenant: cfg.tenantID,
      scope: cfg.scope,
      authorizationURL: `https://login.microsoftonline.com/${cfg.tenantID}/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/${cfg.tenantID}/oauth2/v2.0/token`,
    });
    this.logger.log('MicrosoftOAuthStrategy registered');
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ): Promise<void> {
    try {
      done(
        null,
        normaliseOAuthProfile(
          'microsoft',
          profile?.id || profile?._json?.oid || '',
          profile?.emails?.[0]?.value ||
            profile?._json?.email ||
            profile?._json?.preferred_username ||
            '',
          profile?.displayName || '',
          '',
        ),
      );
    } catch (err) {
      this.logger.error('Microsoft OAuth validate error', err);
      done(err);
    }
  }
}
