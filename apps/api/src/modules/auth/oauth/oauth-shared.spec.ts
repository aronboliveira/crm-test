import {
  SUPPORTED_OAUTH_PROVIDERS,
  isSupportedProvider,
  type OAuthProviderKey,
} from './oauth.constants';
import { normaliseOAuthProfile, type OAuthProfile } from './oauth-profile';
import {
  GoogleOAuthGuard,
  MicrosoftOAuthGuard,
  NextcloudOAuthGuard,
} from './guards/oauth.guards';

/* ================================================================
   oauth.constants
   ================================================================ */

describe('oauth.constants', () => {
  describe('SUPPORTED_OAUTH_PROVIDERS', () => {
    it('should contain exactly 3 providers', () => {
      expect(SUPPORTED_OAUTH_PROVIDERS).toHaveLength(3);
    });

    it.each(['google', 'microsoft', 'nextcloud'])(
      'should include "%s"',
      (p) => {
        expect(
          (SUPPORTED_OAUTH_PROVIDERS as readonly string[]).includes(p),
        ).toBe(true);
      },
    );

    it('should be a readonly tuple at compile time', () => {
      // `as const` is a TS compile-time assertion; at runtime the array
      // is still mutable.  We only assert the element types are correct.
      expect(SUPPORTED_OAUTH_PROVIDERS).toContain('google');
      expect(SUPPORTED_OAUTH_PROVIDERS).toContain('microsoft');
      expect(SUPPORTED_OAUTH_PROVIDERS).toContain('nextcloud');
    });
  });

  describe('isSupportedProvider', () => {
    it.each(['google', 'microsoft', 'nextcloud'])(
      'should return true for "%s"',
      (p) => {
        expect(isSupportedProvider(p)).toBe(true);
      },
    );

    it.each(['facebook', 'github', '', 'GOOGLE', 'Google', ' google'])(
      'should return false for "%s"',
      (p) => {
        expect(isSupportedProvider(p)).toBe(false);
      },
    );
  });
});

/* ================================================================
   oauth-profile – normaliseOAuthProfile
   ================================================================ */

describe('normaliseOAuthProfile', () => {
  it('should return an OAuthProfile with correct shape', () => {
    const profile = normaliseOAuthProfile(
      'google',
      '123',
      'u@g.com',
      'User',
      'https://img.test/a.png',
    );

    expect(profile).toEqual<OAuthProfile>({
      provider: 'google',
      providerId: '123',
      email: 'u@g.com',
      displayName: 'User',
      avatarUrl: 'https://img.test/a.png',
    });
  });

  it('should freeze the returned object', () => {
    const profile = normaliseOAuthProfile('microsoft', '1', 'a@b.c', 'A', '');
    expect(Object.isFrozen(profile)).toBe(true);
  });

  it('should coerce null/undefined values to empty string', () => {
    const profile = normaliseOAuthProfile(
      'nextcloud',
      null as any,
      undefined as any,
      null as any,
      undefined as any,
    );

    expect(profile.providerId).toBe('');
    expect(profile.email).toBe('');
    expect(profile.displayName).toBe('');
    expect(profile.avatarUrl).toBe('');
    expect(profile.provider).toBe('nextcloud');
  });

  it('should coerce numeric providerId to string', () => {
    const profile = normaliseOAuthProfile(
      'google',
      12345 as any,
      'e@m.c',
      'N',
      '',
    );
    expect(profile.providerId).toBe('12345');
  });
});

/* ================================================================
   oauth.guards – createOAuthGuard factory
   ================================================================ */

describe('OAuth guard factory', () => {
  it.each([
    ['GoogleOAuthGuard', GoogleOAuthGuard],
    ['MicrosoftOAuthGuard', MicrosoftOAuthGuard],
    ['NextcloudOAuthGuard', NextcloudOAuthGuard],
  ])('%s should be a constructor', (name, Guard) => {
    expect(typeof Guard).toBe('function');
    expect(Guard.name).toBe(name);
  });

  it('each exported guard should have a unique class identity', () => {
    const guards = [GoogleOAuthGuard, MicrosoftOAuthGuard, NextcloudOAuthGuard];
    const set = new Set(guards);
    expect(set.size).toBe(3);
  });

  it('handleRequest should throw when user is falsy', () => {
    const guard = new GoogleOAuthGuard();
    expect(() => guard.handleRequest(null, null, null)).toThrow(
      /google OAuth failed/i,
    );
  });

  it('handleRequest should throw the original error when present', () => {
    const guard = new MicrosoftOAuthGuard();
    const err = new Error('upstream failure');
    expect(() => guard.handleRequest(err, { id: 1 }, null)).toThrow(
      'upstream failure',
    );
  });

  it('handleRequest should return user object when valid', () => {
    const guard = new NextcloudOAuthGuard();
    const user = { id: 42, name: 'test' };
    expect(guard.handleRequest(null, user, null)).toBe(user);
  });
});
