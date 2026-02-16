import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { nextcloudOAuthConfig } from '../oauth.config';
import { normaliseOAuthProfile } from '../oauth-profile';
import axios from 'axios';

/**
 * Passport strategy for NextCloud OAuth 2.0.
 *
 * NextCloud exposes a standard OAuth 2.0 flow via the `oauth2` app but does
 * NOT return a profile in the token response — we must call the OCS user
 * endpoint to resolve the user identity.
 */
@Injectable()
export default class NextcloudOAuthStrategy extends PassportStrategy(
  Strategy,
  'nextcloud',
) {
  private readonly logger = new Logger(NextcloudOAuthStrategy.name);
  private readonly userInfoURL: string;

  constructor() {
    const cfg = nextcloudOAuthConfig();
    super({
      authorizationURL: cfg.authorizationURL,
      tokenURL: cfg.tokenURL,
      clientID: cfg.clientID || 'NOT_CONFIGURED',
      clientSecret: cfg.clientSecret || 'NOT_CONFIGURED',
      callbackURL: cfg.callbackURL,
    });
    this.userInfoURL = cfg.userInfoURL;
    this.logger.log('NextcloudOAuthStrategy registered');
  }

  /**
   * After receiving the access token, call NextCloud OCS endpoint to
   * resolve the user identity and build a normalised OAuthProfile.
   */
  async validate(
    accessToken: string,
    _refreshToken: string,
    _params: any,
    done: (err: any, user?: any) => void,
  ): Promise<void> {
    try {
      const res = await axios.get(this.userInfoURL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'OCS-APIRequest': 'true',
        },
        timeout: 8_000,
      });

      const data = (res?.data as any)?.ocs?.data;
      done(
        null,
        normaliseOAuthProfile(
          'nextcloud',
          data?.id || '',
          data?.email || '',
          data?.['display-name'] || data?.displayname || '',
          '',
        ),
      );
    } catch (err) {
      this.logger.error('NextCloud OAuth validate error', err);
      done(err);
    }
  }
}
