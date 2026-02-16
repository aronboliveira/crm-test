import { UnauthorizedException } from '@nestjs/common';
import OAuthController from './oauth.controller';

/* ─── mocks ────────────────────────────────────────────── */

const mockOAuthService = {
  findOrCreateAndLogin: jest.fn(),
  getLinkedProviders: jest.fn(),
  unlinkProvider: jest.fn(),
  getProviderAvailability: jest.fn(),
};

const mockAuditService = {
  record: jest.fn().mockResolvedValue(undefined),
};

function createController(): OAuthController {
  return new (OAuthController as any)(mockOAuthService, mockAuditService);
}

/* ─── helpers ──────────────────────────────────────────── */

function fakeReq(overrides: Record<string, any> = {}): any {
  return {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test-agent', 'x-forwarded-for': '' },
    user: {
      provider: 'google',
      providerId: 'goog-123',
      email: 'test@corp.local',
      displayName: 'Test',
      avatarUrl: '',
      id: '507f1f77bcf86cd799439011',
    },
    ...overrides,
  };
}

function fakeRes(): any {
  const res = { redirect: jest.fn() };
  return res;
}

/* ─── tests ────────────────────────────────────────────── */

describe('OAuthController', () => {
  let sut: OAuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    sut = createController();
  });

  /* ── callback flow ── */

  describe('handleCallback (via googleCallback)', () => {
    it('should redirect to success URL with token on successful login', async () => {
      mockOAuthService.findOrCreateAndLogin.mockResolvedValueOnce({
        accessToken: 'jwt-tok-123',
        user: { _id: 'uid', email: 'test@corp.local' },
      });

      const req = fakeReq();
      const res = fakeRes();

      await sut.googleCallback(req, res);

      expect(mockOAuthService.findOrCreateAndLogin).toHaveBeenCalledWith(
        req.user,
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        'auth.login.success',
        expect.objectContaining({ email: 'test@corp.local' }),
        null,
        expect.any(Object),
        expect.objectContaining({ via: 'oauth:google' }),
      );
      expect(res.redirect).toHaveBeenCalledTimes(1);
      const url = res.redirect.mock.calls[0][0] as string;
      expect(url).toContain('token=jwt-tok-123');
      expect(url).toContain('provider=google');
    });

    it('should redirect to failure URL when profile is missing', async () => {
      const req = fakeReq({ user: null });
      const res = fakeRes();

      await sut.googleCallback(req, res);

      expect(mockAuditService.record).toHaveBeenCalledWith(
        'auth.login.failure',
        null,
        null,
        expect.any(Object),
        expect.objectContaining({ provider: 'google' }),
      );
      expect(res.redirect).toHaveBeenCalledTimes(1);
      const url = res.redirect.mock.calls[0][0] as string;
      expect(url).toContain('oauth_error');
    });

    it('should redirect to failure URL when service throws', async () => {
      mockOAuthService.findOrCreateAndLogin.mockRejectedValueOnce(
        new Error('boom'),
      );

      const req = fakeReq();
      const res = fakeRes();

      await sut.googleCallback(req, res);

      expect(res.redirect).toHaveBeenCalledTimes(1);
      const url = res.redirect.mock.calls[0][0] as string;
      expect(url).toContain('oauth_error');
    });

    it('should work for microsoft callback the same way', async () => {
      mockOAuthService.findOrCreateAndLogin.mockResolvedValueOnce({
        accessToken: 'ms-token',
        user: { _id: 'uid', email: 'ms@corp.local' },
      });
      const req = fakeReq({
        user: {
          provider: 'microsoft',
          providerId: 'ms-1',
          email: 'ms@corp.local',
          displayName: 'MS User',
          avatarUrl: '',
        },
      });
      const res = fakeRes();

      await sut.microsoftCallback(req, res);

      expect(res.redirect).toHaveBeenCalledTimes(1);
      const url = res.redirect.mock.calls[0][0] as string;
      expect(url).toContain('token=ms-token');
      expect(url).toContain('provider=microsoft');
    });

    it('should work for nextcloud callback the same way', async () => {
      mockOAuthService.findOrCreateAndLogin.mockResolvedValueOnce({
        accessToken: 'nc-token',
        user: { _id: 'uid2', email: 'nc@cloud.local' },
      });
      const req = fakeReq({
        user: {
          provider: 'nextcloud',
          providerId: 'nc-1',
          email: 'nc@cloud.local',
          displayName: 'NC User',
          avatarUrl: '',
        },
      });
      const res = fakeRes();

      await sut.nextcloudCallback(req, res);

      const url = res.redirect.mock.calls[0][0] as string;
      expect(url).toContain('token=nc-token');
      expect(url).toContain('provider=nextcloud');
    });
  });

  /* ── linked providers ── */

  describe('listLinked', () => {
    it('should delegate to service with userId', async () => {
      const providers = [{ provider: 'google', linkedAt: '2025-01-01' }];
      mockOAuthService.getLinkedProviders.mockResolvedValueOnce(providers);

      const result = await sut.listLinked(fakeReq());
      expect(mockOAuthService.getLinkedProviders).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(providers);
    });
  });

  describe('listProviders', () => {
    it('should return provider availability list', () => {
      const providers = [
        { provider: 'google', enabled: true },
        {
          provider: 'microsoft',
          enabled: false,
          reason: 'Microsoft SSO indisponível no momento',
        },
      ];
      mockOAuthService.getProviderAvailability.mockReturnValueOnce(
        providers as any,
      );

      const result = sut.listProviders();

      expect(mockOAuthService.getProviderAvailability).toHaveBeenCalledTimes(1);
      expect(result).toEqual(providers);
    });
  });

  /* ── unlinkProvider ── */

  describe('unlinkProvider', () => {
    it('should delegate to service for valid provider', async () => {
      mockOAuthService.unlinkProvider.mockResolvedValueOnce({ ok: true });

      const result = await sut.unlinkProvider(fakeReq(), 'google');
      expect(mockOAuthService.unlinkProvider).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        'google',
      );
      expect(result).toEqual({ ok: true });
    });

    it('should throw for unsupported provider name', async () => {
      await expect(sut.unlinkProvider(fakeReq(), 'facebook')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw for empty provider string', async () => {
      await expect(sut.unlinkProvider(fakeReq(), '')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
