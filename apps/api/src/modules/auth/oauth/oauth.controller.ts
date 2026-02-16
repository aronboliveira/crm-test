import {
  Controller,
  Get,
  Delete,
  UseGuards,
  Req,
  Res,
  Param,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import OAuthService from './oauth.service';
import type { OAuthProfile } from './oauth-profile';
import { isSupportedProvider } from './oauth.constants';
import {
  GoogleOAuthGuard,
  MicrosoftOAuthGuard,
  NextcloudOAuthGuard,
} from './guards/oauth.guards';
import JwtAuthGuard from '../guards/jwt-auth.guard';
import AuthAuditService from '../../audit/auth-audit.service';
import { oauthFrontendUrls } from './oauth.config';

/**
 * Handles the three SSO / OAuth provider flows plus link/unlink management.
 *
 * ### Flow for each provider:
 * 1. `GET /auth/oauth/:provider`          → redirect to provider login
 * 2. `GET /auth/oauth/:provider/callback`  → handle redirect, issue JWT,
 *    redirect to frontend with `?token=<jwt>` so the SPA can persist it.
 *
 * ### Account link management (requires JWT):
 * - `GET  /auth/oauth/linked`              → list linked providers
 * - `DELETE /auth/oauth/linked/:provider`   → unlink a provider
 */
@Controller('/auth/oauth')
export default class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly oauth: OAuthService,
    private readonly audit: AuthAuditService,
  ) {
    this.logger.log('OAuthController initialised');
  }

  /* ─────────────── Google ─────────────── */

  @Get('/google')
  @UseGuards(GoogleOAuthGuard)
  googleLogin() {
    // Guard triggers the redirect — nothing to do here
  }

  @Get('/google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleCallback(req, res, 'google');
  }

  /* ─────────────── Microsoft ─────────────── */

  @Get('/microsoft')
  @UseGuards(MicrosoftOAuthGuard)
  microsoftLogin() {
    // Guard triggers the redirect
  }

  @Get('/microsoft/callback')
  @UseGuards(MicrosoftOAuthGuard)
  async microsoftCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleCallback(req, res, 'microsoft');
  }

  /* ─────────────── NextCloud ─────────────── */

  @Get('/nextcloud')
  @UseGuards(NextcloudOAuthGuard)
  nextcloudLogin() {
    // Guard triggers the redirect
  }

  @Get('/nextcloud/callback')
  @UseGuards(NextcloudOAuthGuard)
  async nextcloudCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleCallback(req, res, 'nextcloud');
  }

  /* ─────────────── Linked providers (JWT-protected) ─────────────── */

  @UseGuards(JwtAuthGuard)
  @Get('/linked')
  async listLinked(@Req() req: any) {
    const userId = String(req?.user?.id || '').trim();
    return this.oauth.getLinkedProviders(userId);
  }

  @Get('/providers')
  listProviders() {
    return this.oauth.getProviderAvailability();
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/linked/:provider')
  async unlinkProvider(@Req() req: any, @Param('provider') provider: string) {
    const userId = String(req?.user?.id || '').trim();
    if (!isSupportedProvider(provider)) {
      throw new UnauthorizedException('Unknown provider');
    }
    return this.oauth.unlinkProvider(userId, provider);
  }

  /* ─────────────── shared callback handler ─────────────── */

  private async handleCallback(req: Request, res: Response, provider: string) {
    const { successURL, failureURL } = oauthFrontendUrls();
    const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || '');
    const ua = String(req?.headers?.['user-agent'] || '');

    try {
      const profile = req.user as OAuthProfile;
      if (!profile || !profile.providerId) {
        throw new UnauthorizedException('OAuth profile missing');
      }

      const result = await this.oauth.findOrCreateAndLogin(profile);

      await this.audit.record(
        'auth.login.success',
        {
          userId: result?.user?._id ? String(result.user._id) : null,
          email: result?.user?.email
            ? String(result.user.email)
            : profile.email || null,
        },
        null,
        { ip, ua },
        { via: `oauth:${provider}` },
      );

      // Redirect to frontend with the JWT in a query param.
      // The frontend callback page reads it, stores it, and redirects to /dashboard.
      const url = new URL(successURL);
      url.searchParams.set('token', result.accessToken);
      url.searchParams.set('provider', provider);
      return res.redirect(url.toString());
    } catch (err: any) {
      this.logger.error(`OAuth ${provider} callback failed`, err);

      await this.audit.record(
        'auth.login.failure',
        null,
        null,
        { ip, ua },
        { provider, reason: String(err?.message || 'unknown') },
      );

      return res.redirect(failureURL);
    }
  }
}
