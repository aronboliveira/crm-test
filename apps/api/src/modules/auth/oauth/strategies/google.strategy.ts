import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { googleOAuthConfig } from '../oauth.config';
import { normaliseOAuthProfile } from '../oauth-profile';

/**
 * Passport strategy for Google / Google Workspace OAuth 2.0.
 *
 * Extracts `profile` and `email` scopes.  The verify callback normalises
 * the profile into a flat `OAuthProfile` shape consumed by `OAuthService`.
 */
@Injectable()
export default class GoogleOAuthStrategy extends PassportStrategy(
  Strategy,
  'google',
) {
  private readonly logger = new Logger(GoogleOAuthStrategy.name);

  constructor() {
    const cfg = googleOAuthConfig();
    super({
      clientID: cfg.clientID || 'NOT_CONFIGURED',
      clientSecret: cfg.clientSecret || 'NOT_CONFIGURED',
      callbackURL: cfg.callbackURL,
      scope: cfg.scope,
    });
    this.logger.log('GoogleOAuthStrategy registered');
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      done(
        null,
        normaliseOAuthProfile(
          'google',
          profile?.id,
          profile?.emails?.[0]?.value || profile?._json?.email || '',
          profile?.displayName || '',
          profile?.photos?.[0]?.value || '',
        ),
      );
    } catch (err) {
      this.logger.error('Google OAuth validate error', err);
      done(err as Error, undefined);
    }
  }
}
