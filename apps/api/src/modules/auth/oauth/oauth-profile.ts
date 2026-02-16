import type { OAuthProviderKey } from './oauth.constants';

/** Normalised profile returned by every OAuth strategy's `validate()`. */
export interface OAuthProfile {
  readonly provider: OAuthProviderKey;
  readonly providerId: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string;
}

/**
 * DRY helper: every strategy extracts the same five fields from provider-
 * specific shapes.  Instead of repeating the object-literal in each
 * `validate()`, call this with the raw fragments.
 */
export function normaliseOAuthProfile(
  provider: OAuthProviderKey,
  providerId: string,
  email: string,
  displayName: string,
  avatarUrl: string,
): OAuthProfile {
  return Object.freeze({
    provider,
    providerId: String(providerId || ''),
    email: String(email || ''),
    displayName: String(displayName || ''),
    avatarUrl: String(avatarUrl || ''),
  });
}
