import { UnauthorizedException, ConflictException } from '@nestjs/common';
import OAuthService from './oauth.service';
import type { OAuthProfile } from './oauth-profile';

/* ─── helpers ──────────────────────────────────────────── */

const fakeOid = '507f1f77bcf86cd799439011';

function fakeUser(overrides: Record<string, any> = {}) {
  return {
    _id: fakeOid,
    email: 'test@corp.local',
    username: 'test',
    passwordHash: '$2b$12$FAKEHASHVALUE',
    roles: ['admin'],
    tokenVersion: 2,
    disabled: false,
    oauthAccounts: [],
    ...overrides,
  };
}

function fakeProfile(overrides: Partial<OAuthProfile> = {}): OAuthProfile {
  return {
    provider: 'google',
    providerId: 'goog-123',
    email: 'test@corp.local',
    displayName: 'Test User',
    avatarUrl: 'https://img.test/avatar.png',
    ...overrides,
  };
}

/* ─── mocks ────────────────────────────────────────────── */

const mockTokenIssuer = {
  issue: jest.fn().mockResolvedValue({
    accessToken: 'jwt-tok',
    user: { email: 'test@corp.local' },
  }),
};

const mockRepo = {
  findOne: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
  create: jest.fn((dto: any) => dto),
  save: jest.fn().mockImplementation((u: any) => Promise.resolve(u)),
};

/* ─── SUT factory ──────────────────────────────────────── */

function createService(): OAuthService {
  return new (OAuthService as any)(mockTokenIssuer, mockRepo);
}

/* ─── tests ────────────────────────────────────────────── */

describe('OAuthService', () => {
  let sut: OAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    sut = createService();
  });

  /* ── findOrCreateAndLogin ── */

  describe('findOrCreateAndLogin', () => {
    it('should login existing user found by OAuth link', async () => {
      const user = fakeUser({
        oauthAccounts: [
          {
            provider: 'google',
            providerId: 'goog-123',
            linkedAt: '2025-01-01',
          },
        ],
      });
      mockRepo.findOne.mockResolvedValueOnce(user); // findByOAuthLink

      const result = await sut.findOrCreateAndLogin(fakeProfile());

      expect(mockTokenIssuer.issue).toHaveBeenCalledWith(user);
      expect(result.accessToken).toBe('jwt-tok');
      // touchOAuthLink should have been called (update)
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('should link and login when no OAuth link exists but email matches', async () => {
      const user = fakeUser();
      mockRepo.findOne
        .mockResolvedValueOnce(null) // findByOAuthLink → not found
        .mockResolvedValueOnce(user); // email fallback → found

      const result = await sut.findOrCreateAndLogin(fakeProfile());

      expect(mockTokenIssuer.issue).toHaveBeenCalledWith(user);
      expect(result.accessToken).toBe('jwt-tok');
      // addOAuthLink → update
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('should throw when email-matched user is disabled', async () => {
      mockRepo.findOne
        .mockResolvedValueOnce(null) // findByOAuthLink
        .mockResolvedValueOnce(fakeUser({ disabled: true })); // email match

      await expect(sut.findOrCreateAndLogin(fakeProfile())).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should auto-provision when no user exists at all', async () => {
      mockRepo.findOne
        .mockResolvedValueOnce(null) // findByOAuthLink
        .mockResolvedValueOnce(null) // email fallback
        .mockResolvedValueOnce(null); // provisionUser duplicate check

      // Re-apply create/save stubs cleared by jest.clearAllMocks()
      mockRepo.create.mockImplementation((dto: any) => dto);
      mockRepo.save.mockImplementation((u: any) => Promise.resolve(u));

      const result = await sut.findOrCreateAndLogin(fakeProfile());

      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
      expect(mockTokenIssuer.issue).toHaveBeenCalled();
      expect(result.accessToken).toBe('jwt-tok');
    });

    it('should throw when provider returns no email and no existing link', async () => {
      mockRepo.findOne
        .mockResolvedValueOnce(null) // findByOAuthLink
        .mockResolvedValueOnce(null); // email fallback (empty email → skip)

      await expect(
        sut.findOrCreateAndLogin(fakeProfile({ email: '' })),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ConflictException on race-condition duplicate email during provisioning', async () => {
      // Fully re-assign findOne to control return per invocation
      const findOneResults = [null, null, fakeUser()];
      let idx = 0;
      mockRepo.findOne = jest.fn(() => {
        const res = findOneResults[idx] ?? null;
        idx++;
        return Promise.resolve(res);
      });
      mockRepo.create = jest.fn((dto: any) => dto);
      mockRepo.save = jest.fn((u: any) => Promise.resolve(u));

      await expect(
        sut.findOrCreateAndLogin(fakeProfile({ email: 'other@corp.local' })),
      ).rejects.toThrow(ConflictException);
    });

    it('provisioned user should have viewer role and empty password', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      // Re-apply create/save stubs cleared by jest.clearAllMocks()
      let capturedDto: any = null;
      mockRepo.create.mockImplementation((dto: any) => {
        capturedDto = dto;
        return dto;
      });
      mockRepo.save.mockImplementation((u: any) => Promise.resolve(u));

      await sut.findOrCreateAndLogin(fakeProfile({ email: 'new@example.com' }));

      expect(capturedDto).not.toBeNull();
      expect(capturedDto.roles).toEqual(['viewer']);
      expect(capturedDto.passwordHash).toBe('');
      expect(capturedDto.email).toBe('new@example.com');
      expect(capturedDto.oauthAccounts).toHaveLength(1);
      expect(capturedDto.oauthAccounts[0].provider).toBe('google');
    });
  });

  /* ── getLinkedProviders ── */

  describe('getLinkedProviders', () => {
    it('should return mapped linked accounts', async () => {
      const user = fakeUser({
        oauthAccounts: [
          {
            provider: 'google',
            providerId: 'g-1',
            email: 'a@b.com',
            linkedAt: '2025-01-01',
            lastUsedAt: '2025-06-01',
          },
        ],
      });
      mockRepo.findOne.mockResolvedValueOnce(user);

      const result = await sut.getLinkedProviders(fakeOid);

      expect(result).toEqual([
        {
          provider: 'google',
          email: 'a@b.com',
          linkedAt: '2025-01-01',
          lastUsedAt: '2025-06-01',
        },
      ]);
    });

    it('should return [] for invalid ObjectId', async () => {
      const result = await sut.getLinkedProviders('not-an-oid');
      expect(result).toEqual([]);
    });

    it('should return [] when user not found', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      const result = await sut.getLinkedProviders(fakeOid);
      expect(result).toEqual([]);
    });
  });

  /* ── unlinkProvider ── */

  describe('unlinkProvider', () => {
    it('should remove the specified provider', async () => {
      const user = fakeUser({
        oauthAccounts: [
          { provider: 'google', providerId: 'g-1', linkedAt: '2025-01-01' },
          { provider: 'microsoft', providerId: 'm-1', linkedAt: '2025-02-01' },
        ],
      });
      mockRepo.findOne.mockResolvedValueOnce(user);

      const result = await sut.unlinkProvider(fakeOid, 'google');

      expect(result).toEqual({ ok: true });
      const updatedAccounts = mockRepo.update.mock.calls[0][1].oauthAccounts;
      expect(updatedAccounts).toHaveLength(1);
      expect(updatedAccounts[0].provider).toBe('microsoft');
    });

    it('should return ok: true if provider is not linked (idempotent)', async () => {
      const user = fakeUser({ oauthAccounts: [] });
      mockRepo.findOne.mockResolvedValueOnce(user);

      const result = await sut.unlinkProvider(fakeOid, 'google');
      expect(result).toEqual({ ok: true });
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when unlinking last auth method without password', async () => {
      const user = fakeUser({
        passwordHash: '',
        oauthAccounts: [
          { provider: 'google', providerId: 'g-1', linkedAt: '2025-01-01' },
        ],
      });
      mockRepo.findOne.mockResolvedValueOnce(user);

      await expect(sut.unlinkProvider(fakeOid, 'google')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow unlinking last OAuth if user has a password', async () => {
      const user = fakeUser({
        passwordHash: '$2b$12$HASH',
        oauthAccounts: [
          { provider: 'google', providerId: 'g-1', linkedAt: '2025-01-01' },
        ],
      });
      mockRepo.findOne.mockResolvedValueOnce(user);

      const result = await sut.unlinkProvider(fakeOid, 'google');
      expect(result).toEqual({ ok: true });
    });

    it('should throw for invalid ObjectId', async () => {
      await expect(sut.unlinkProvider('bad', 'google')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw when user not found', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      await expect(sut.unlinkProvider(fakeOid, 'google')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getProviderAvailability', () => {
    const envBackup = { ...process.env };

    afterEach(() => {
      process.env = { ...envBackup };
    });

    it('returns enabled=true for providers with credentials', () => {
      process.env.OAUTH_GOOGLE_CLIENT_ID = 'g-id';
      process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'g-secret';
      process.env.OAUTH_MICROSOFT_CLIENT_ID = 'm-id';
      process.env.OAUTH_MICROSOFT_CLIENT_SECRET = 'm-secret';
      process.env.OAUTH_NEXTCLOUD_CLIENT_ID = 'n-id';
      process.env.OAUTH_NEXTCLOUD_CLIENT_SECRET = 'n-secret';

      const list = sut.getProviderAvailability();
      expect(list.every((item) => item.enabled)).toBe(true);
    });

    it('returns disabled provider with reason when credentials are missing', () => {
      delete process.env.OAUTH_MICROSOFT_CLIENT_ID;
      delete process.env.OAUTH_MICROSOFT_CLIENT_SECRET;

      const list = sut.getProviderAvailability();
      const microsoft = list.find((item) => item.provider === 'microsoft');

      expect(microsoft?.enabled).toBe(false);
      expect(microsoft?.reason).toContain('Microsoft SSO');
    });
  });
});
