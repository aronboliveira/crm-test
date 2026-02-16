/** Provider keys supported by the OAuth subsystem. */
export const SUPPORTED_OAUTH_PROVIDERS = [
  'google',
  'microsoft',
  'nextcloud',
] as const;

export type OAuthProviderKey = (typeof SUPPORTED_OAUTH_PROVIDERS)[number];

/** Guard predicate for use in runtime validation. */
export function isSupportedProvider(v: string): v is OAuthProviderKey {
  return (SUPPORTED_OAUTH_PROVIDERS as readonly string[]).includes(v);
}
