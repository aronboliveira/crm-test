import TokenIssuer from './token-issuer.service';

/* ─── mocks ────────────────────────────────────────────── */

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-jwt'),
};

const mockRbacService = {
  resolvePermissions: jest.fn().mockResolvedValue(['tasks.read']),
};

function createIssuer(): TokenIssuer {
  return new (TokenIssuer as any)(mockJwtService, mockRbacService);
}

/* ─── helpers ──────────────────────────────────────────── */

function fakeUser(overrides: Record<string, any> = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@corp.local',
    passwordHash: '$2b$12$HASH',
    twoFactorSecret: 'secret',
    twoFactorTempSecret: 'temp-secret',
    twoFactorRecoveryCodes: ['CODE1'],
    roles: ['admin'],
    tokenVersion: 3,
    disabled: false,
    ...overrides,
  };
}

/* ─── tests ────────────────────────────────────────────── */

describe('TokenIssuer', () => {
  let sut: TokenIssuer;

  beforeEach(() => {
    jest.clearAllMocks();
    sut = createIssuer();
  });

  describe('issue', () => {
    it('should resolve RBAC permissions and return signed JWT', async () => {
      const user = fakeUser();
      const result = await sut.issue(user as any);

      expect(mockRbacService.resolvePermissions).toHaveBeenCalledWith([
        'admin',
      ]);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: '507f1f77bcf86cd799439011',
          email: 'test@corp.local',
          role: 'admin',
          perms: ['tasks.read'],
          tv: 3,
        }),
      );
      expect(result.accessToken).toBe('signed-jwt');
    });

    it('should strip sensitive fields from user object', async () => {
      const user = fakeUser();
      const result = await sut.issue(user as any);

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('twoFactorSecret');
      expect(result.user).not.toHaveProperty('twoFactorTempSecret');
      expect(result.user).not.toHaveProperty('twoFactorRecoveryCodes');
      expect(result.user.email).toBe('test@corp.local');
    });

    it('should default to viewer role when roles array is empty', async () => {
      const user = fakeUser({ roles: [] });
      await sut.issue(user as any);

      expect(mockRbacService.resolvePermissions).toHaveBeenCalledWith([
        'viewer',
      ]);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'viewer' }),
      );
    });

    it('should default tokenVersion to 1 when not a number', async () => {
      const user = fakeUser({ tokenVersion: undefined });
      await sut.issue(user as any);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ tv: 1 }),
      );
    });

    it('should use _doc if present (Mongoose pattern)', async () => {
      const innerDoc = {
        _id: 'abc',
        email: 'inner@corp.local',
        passwordHash: 'hash',
        twoFactorSecret: 's',
        twoFactorTempSecret: 'ts',
        twoFactorRecoveryCodes: [],
      };
      const user = fakeUser({ _doc: innerDoc });
      const result = await sut.issue(user as any);

      expect(result.user.email).toBe('inner@corp.local');
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('stripSensitive (static)', () => {
    it('should remove all sensitive fields', () => {
      const raw = {
        email: 'a@b.com',
        passwordHash: 'h',
        twoFactorSecret: 's',
        twoFactorTempSecret: 'ts',
        twoFactorRecoveryCodes: ['c'],
        name: 'keep me',
      };
      const result = TokenIssuer.stripSensitive(raw);

      expect(result).toEqual({ email: 'a@b.com', name: 'keep me' });
    });

    it('should not mutate the original object', () => {
      const raw = { passwordHash: 'h', email: 'a@b.com' };
      TokenIssuer.stripSensitive(raw);
      expect(raw.passwordHash).toBe('h');
    });
  });
});
