/**
 * Centralised OAuth / SSO configuration derived from environment variables.
 *
 * Every property falls back to a safe empty string so the application can
 * boot even when SSO keys are not yet configured — the strategies simply
 * stay dormant in that case.
 */

export interface OAuthProviderConfig {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

export interface GoogleOAuthConfig extends OAuthProviderConfig {
  scope: string[];
}

export interface MicrosoftOAuthConfig extends OAuthProviderConfig {
  tenantID: string;
  scope: string[];
}

export interface NextcloudOAuthConfig extends OAuthProviderConfig {
  baseURL: string;
  authorizationURL: string;
  tokenURL: string;
  userInfoURL: string;
}

export function googleOAuthConfig(): GoogleOAuthConfig {
  return {
    clientID: process.env.OAUTH_GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || '',
    callbackURL:
      process.env.OAUTH_GOOGLE_CALLBACK_URL ||
      'http://localhost:3000/auth/oauth/google/callback',
    scope: ['email', 'profile', 'openid'],
  };
}

export function microsoftOAuthConfig(): MicrosoftOAuthConfig {
  return {
    clientID: process.env.OAUTH_MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.OAUTH_MICROSOFT_CLIENT_SECRET || '',
    callbackURL:
      process.env.OAUTH_MICROSOFT_CALLBACK_URL ||
      'http://localhost:3000/auth/oauth/microsoft/callback',
    tenantID: process.env.OAUTH_MICROSOFT_TENANT_ID || 'common',
    scope: ['openid', 'profile', 'email', 'User.Read'],
  };
}

export function nextcloudOAuthConfig(): NextcloudOAuthConfig {
  const base = (
    process.env.OAUTH_NEXTCLOUD_BASE_URL || 'https://cloud.example.com'
  ).replace(/\/+$/, '');

  return {
    clientID: process.env.OAUTH_NEXTCLOUD_CLIENT_ID || '',
    clientSecret: process.env.OAUTH_NEXTCLOUD_CLIENT_SECRET || '',
    callbackURL:
      process.env.OAUTH_NEXTCLOUD_CALLBACK_URL ||
      'http://localhost:3000/auth/oauth/nextcloud/callback',
    baseURL: base,
    authorizationURL: `${base}/index.php/apps/oauth2/authorize`,
    tokenURL: `${base}/index.php/apps/oauth2/api/v1/token`,
    userInfoURL: `${base}/ocs/v2.php/cloud/user?format=json`,
  };
}

export function oauthFrontendUrls() {
  return {
    successURL:
      process.env.OAUTH_FRONTEND_SUCCESS_URL ||
      'http://localhost:5173/oauth/callback',
    failureURL:
      process.env.OAUTH_FRONTEND_FAILURE_URL ||
      'http://localhost:5173/login?oauth_error=1',
  };
}
