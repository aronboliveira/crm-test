import { UnauthorizedException } from '@nestjs/common';
import AuthService from './auth.service';
import bcrypt from 'bcryptjs';

jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(),
    verify: jest.fn(),
  },
}));

const mockAuthenticator = jest.requireMock('otplib').authenticator;

/* ─── helpers ──────────────────────────────────────────── */

const fakeOid = '507f1f77bcf86cd799439011';

function mockUser(overrides: Record<string, any> = {}) {
  return {
    _id: fakeOid,
    email: 'test@corp.local',
    passwordHash: '$2b$12$FAKEHASHVALUE',
    roles: ['admin'],
    tokenVersion: 1,
    disabled: false,
    ...overrides,
  };
}

/* ─── mocks ────────────────────────────────────────────── */

const mockUsersService = {
  findByEmail: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-jwt-token'),
  verify: jest.fn(),
};

const mockRbacService = {
  resolvePermissions: jest
    .fn()
    .mockResolvedValue(['projects.read', 'tasks.read']),
};

const mockUsersRepo = {
  findOne: jest.fn(),
  update: jest.fn(),
};

function createService() {
  return new (AuthService as any)(
    mockUsersService,
    mockJwtService,
    mockRbacService,
    mockUsersRepo,
  ) as AuthService;
}

/* ─── tests ────────────────────────────────────────────── */

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticator.generateSecret.mockReturnValue('OTP_SECRET_123');
    mockAuthenticator.verify.mockReturnValue(false);
    service = createService();
  });

  /* ── validateUser ── */
  describe('validateUser', () => {
    it('should return user when credentials are correct', async () => {
      const hash = await bcrypt.hash('Test#123', 12);
      const user = mockUser({ passwordHash: hash });
      mockUsersService.findByEmail.mockResolvedValue(user);

      const result = await service.validateUser('test@corp.local', 'Test#123');
      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const result = await service.validateUser('no@corp.local', 'pass');
      expect(result).toBeNull();
    });

    it('should return null when user is disabled', async () => {
      mockUsersService.findByEmail.mockResolvedValue(
        mockUser({ disabled: true }),
      );
      const result = await service.validateUser('test@corp.local', 'pass');
      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      mockUsersService.findByEmail.mockResolvedValue(
        mockUser({ lockedAt: new Date().toISOString() }),
      );
      await expect(
        service.validateUser('test@corp.local', 'pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return null when password does not match', async () => {
      const hash = await bcrypt.hash('RealPassword', 12);
      mockUsersService.findByEmail.mockResolvedValue(
        mockUser({ passwordHash: hash }),
      );
      const result = await service.validateUser(
        'test@corp.local',
        'WrongPassword',
      );
      expect(result).toBeNull();
    });
  });

  /* ── login ── */
  describe('login', () => {
    it('should return accessToken and user without passwordHash', async () => {
      const user = mockUser();
      const result = await service.login(user);

      expect(result.accessToken).toBe('signed-jwt-token');
      expect(result.user).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.email).toBe('test@corp.local');
    });

    it('should strip passwordHash from _doc property (Mongoose-style)', async () => {
      const user = {
        _doc: {
          _id: fakeOid,
          email: 'doc@corp.local',
          passwordHash: '$2b$12$SECRET',
          roles: ['admin'],
        },
        roles: ['admin'],
        email: 'doc@corp.local',
        _id: fakeOid,
      };
      const result = await service.login(user);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.email).toBe('doc@corp.local');
    });

    it('should strip 2FA-sensitive fields from login response user', async () => {
      const user = mockUser({
        twoFactorSecret: 'SECRET',
        twoFactorTempSecret: 'TEMP',
        twoFactorRecoveryCodes: ['ABCD1234'],
      });

      const result = await service.login(user);

      expect(result.user).not.toHaveProperty('twoFactorSecret');
      expect(result.user).not.toHaveProperty('twoFactorTempSecret');
      expect(result.user).not.toHaveProperty('twoFactorRecoveryCodes');
    });

    it('should default to viewer role when user has no roles', async () => {
      const user = mockUser({ roles: [] });
      await service.login(user);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'viewer' }),
      );
    });

    it('should use the first role from user roles array', async () => {
      const user = mockUser({ roles: ['manager', 'admin'] });
      await service.login(user);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'manager' }),
      );
    });

    it('should include resolved permissions in JWT payload', async () => {
      mockRbacService.resolvePermissions.mockResolvedValue([
        'projects.read',
        'tasks.write',
      ]);
      const user = mockUser();
      await service.login(user);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          perms: ['projects.read', 'tasks.write'],
        }),
      );
    });

    it('should include tokenVersion in JWT payload', async () => {
      const user = mockUser({ tokenVersion: 5 });
      await service.login(user);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ tv: 5 }),
      );
    });

    it('should default tokenVersion to 1 when missing', async () => {
      const user = mockUser({ tokenVersion: undefined });
      await service.login(user);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ tv: 1 }),
      );
    });
  });

  /* ── changePassword ── */
  describe('changePassword', () => {
    it('should update password when current password matches', async () => {
      const oldHash = await bcrypt.hash('OldPass#1', 12);
      mockUsersRepo.findOne.mockResolvedValue(
        mockUser({ passwordHash: oldHash }),
      );
      mockUsersRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.changePassword(
        fakeOid,
        'OldPass#1',
        'NewPass#2',
      );
      expect(result).toEqual({ ok: true });
      expect(mockUsersRepo.update).toHaveBeenCalled();
    });

    it('should throw when userId is invalid', async () => {
      await expect(
        service.changePassword('invalid', 'old', 'new'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when user not found', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);
      await expect(
        service.changePassword(fakeOid, 'old', 'new'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when current password is wrong', async () => {
      const hash = await bcrypt.hash('CorrectPass', 12);
      mockUsersRepo.findOne.mockResolvedValue(mockUser({ passwordHash: hash }));

      await expect(
        service.changePassword(fakeOid, 'WrongPass', 'NewPass'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  /* ── requestEmailChange ── */
  describe('requestEmailChange', () => {
    it('should accept email change when password is correct', async () => {
      const hash = await bcrypt.hash('MyPass#1', 12);
      mockUsersRepo.findOne.mockResolvedValue(mockUser({ passwordHash: hash }));
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.requestEmailChange(
        fakeOid,
        'new@corp.local',
        'MyPass#1',
      );
      expect(result.ok).toBe(true);
      expect(result.message).toContain('recorded');
    });

    it('should reject when email is already taken by another user', async () => {
      const hash = await bcrypt.hash('Pass#1', 12);
      mockUsersRepo.findOne.mockResolvedValue(mockUser({ passwordHash: hash }));
      mockUsersService.findByEmail.mockResolvedValue({
        _id: 'differentUserId',
      });

      const result = await service.requestEmailChange(
        fakeOid,
        'taken@corp.local',
        'Pass#1',
      );
      expect(result.ok).toBe(false);
      expect(result.message).toContain('already in use');
    });

    it('should throw when userId is invalid', async () => {
      await expect(
        service.requestEmailChange('bad', 'a@b.com', 'pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when password is incorrect', async () => {
      const hash = await bcrypt.hash('CorrectPass', 12);
      mockUsersRepo.findOne.mockResolvedValue(mockUser({ passwordHash: hash }));

      await expect(
        service.requestEmailChange(fakeOid, 'new@b.com', 'WrongPass'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  /* ── two-factor auth ── */
  describe('two-factor', () => {
    describe('isTwoFactorEnabled', () => {
      it('returns false for invalid user id', async () => {
        await expect(service.isTwoFactorEnabled('bad-id')).resolves.toBe(false);
      });

      it('returns true when user has twoFactorEnabled flag', async () => {
        mockUsersRepo.findOne.mockResolvedValue(
          mockUser({ twoFactorEnabled: true }),
        );

        await expect(service.isTwoFactorEnabled(fakeOid)).resolves.toBe(true);
      });
    });

    describe('setupTwoFactor', () => {
      it('stores temp secret and returns otpauth url', async () => {
        mockUsersRepo.findOne.mockResolvedValue(mockUser());

        const result = await service.setupTwoFactor(fakeOid);

        expect(mockAuthenticator.generateSecret).toHaveBeenCalled();
        expect(mockUsersRepo.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            twoFactorTempSecret: 'OTP_SECRET_123',
          }),
        );
        expect(result.secret).toBe('OTP_SECRET_123');
        expect(result.otpauthUrl).toContain('otpauth://totp/');
      });
    });

    describe('enableTwoFactor', () => {
      it('throws when setup has not been started', async () => {
        mockUsersRepo.findOne.mockResolvedValue(
          mockUser({ twoFactorTempSecret: '' }),
        );

        await expect(
          service.enableTwoFactor(fakeOid, '123456'),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('throws when provided code is invalid', async () => {
        mockUsersRepo.findOne.mockResolvedValue(
          mockUser({ twoFactorTempSecret: 'OTP_SECRET_123' }),
        );
        mockAuthenticator.verify.mockReturnValue(false);

        await expect(
          service.enableTwoFactor(fakeOid, '000000'),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('enables two-factor and persists recovery codes on valid code', async () => {
        mockUsersRepo.findOne.mockResolvedValue(
          mockUser({ twoFactorTempSecret: 'OTP_SECRET_123', tokenVersion: 3 }),
        );
        mockAuthenticator.verify.mockReturnValue(true);

        const result = await service.enableTwoFactor(fakeOid, '123456');

        expect(result.ok).toBe(true);
        expect(result.recoveryCodes).toHaveLength(8);
        expect(mockUsersRepo.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            twoFactorEnabled: true,
            twoFactorSecret: 'OTP_SECRET_123',
            tokenVersion: 4,
          }),
        );
      });
    });

    describe('disableTwoFactor', () => {
      it('returns ok when 2FA is already disabled', async () => {
        mockUsersRepo.findOne.mockResolvedValue(
          mockUser({ twoFactorEnabled: false, twoFactorSecret: undefined }),
        );

        await expect(
          service.disableTwoFactor(fakeOid, '123456'),
        ).resolves.toEqual({
          ok: true,
        });
      });

      it('disables 2FA when valid recovery code is provided', async () => {
        mockUsersRepo.findOne.mockResolvedValue(
          mockUser({
            twoFactorEnabled: true,
            twoFactorSecret: 'OTP_SECRET_123',
            twoFactorRecoveryCodes: ['ABCD1234', 'WXYZ9999'],
            tokenVersion: 2,
          }),
        );
        mockAuthenticator.verify.mockReturnValue(false);

        const result = await service.disableTwoFactor(fakeOid, 'abcd1234');

        expect(result).toEqual({ ok: true });
        expect(mockUsersRepo.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            twoFactorEnabled: false,
            tokenVersion: 3,
          }),
        );
      });
    });

    describe('verifyTwoFactorForLogin', () => {
      it('does nothing when user has no 2FA enabled', async () => {
        mockUsersRepo.findOne.mockResolvedValue(
          mockUser({ twoFactorEnabled: false }),
        );

        await expect(
          service.verifyTwoFactorForLogin(fakeOid, undefined),
        ).resolves.toBeUndefined();
      });

      it('throws when 2FA is enabled and no code is provided', async () => {
        mockUsersRepo.findOne.mockResolvedValue(
          mockUser({
            twoFactorEnabled: true,
            twoFactorSecret: 'OTP_SECRET_123',
          }),
        );

        await expect(service.verifyTwoFactorForLogin(fakeOid)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('consumes recovery code when used at login', async () => {
        mockUsersRepo.findOne.mockResolvedValue(
          mockUser({
            twoFactorEnabled: true,
            twoFactorSecret: 'OTP_SECRET_123',
            twoFactorRecoveryCodes: ['CODE1111', 'CODE2222'],
          }),
        );
        mockAuthenticator.verify.mockReturnValue(false);

        await expect(
          service.verifyTwoFactorForLogin(fakeOid, 'code1111'),
        ).resolves.toBeUndefined();

        expect(mockUsersRepo.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            twoFactorRecoveryCodes: ['CODE2222'],
          }),
        );
      });
    });

    /* ── generateTwoFactorToken ── */
    describe('generateTwoFactorToken', () => {
      it('should generate a JWT for 2FA challenge', async () => {
        const token = await service.generateTwoFactorToken(fakeOid);

        expect(mockJwtService.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            sub: fakeOid,
            type: '2fa-challenge',
            exp: expect.any(Number),
          }),
        );
        expect(token).toBe('signed-jwt-token');
      });

      it('should throw for invalid ObjectId', async () => {
        await expect(
          service.generateTwoFactorToken('invalid-oid'),
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    /* ── verifyTwoFactorToken ── */
    describe('verifyTwoFactorToken', () => {
      beforeEach(() => {
        mockJwtService.verify = jest.fn().mockReturnValue({
          sub: fakeOid,
          type: '2fa-challenge',
          exp: Math.floor(Date.now() / 1000) + 300,
        });
      });

      it('should verify token and code, returning user', async () => {
        const user = mockUser({
          twoFactorEnabled: true,
          twoFactorSecret: 'OTP_SECRET_123',
        });
        mockUsersRepo.findOne.mockResolvedValue(user);
        mockAuthenticator.verify.mockReturnValue(true);

        const result = await service.verifyTwoFactorToken(
          'valid-2fa-token',
          '123456',
        );

        expect(result).toBe(user);
        expect(mockAuthenticator.verify).toHaveBeenCalledWith({
          token: '123456',
          secret: 'OTP_SECRET_123',
        });
      });

      it('should throw on invalid token type', async () => {
        mockJwtService.verify = jest.fn().mockReturnValue({
          sub: fakeOid,
          type: 'access-token',
        });

        await expect(
          service.verifyTwoFactorToken('token', '123456'),
        ).rejects.toThrow('Invalid token type');
      });

      it('should throw on invalid code', async () => {
        const user = mockUser({
          twoFactorEnabled: true,
          twoFactorSecret: 'OTP_SECRET_123',
          twoFactorRecoveryCodes: [],
        });
        mockUsersRepo.findOne.mockResolvedValue(user);
        mockAuthenticator.verify.mockReturnValue(false);

        await expect(
          service.verifyTwoFactorToken('token', 'wrong-code'),
        ).rejects.toThrow('Invalid two-factor code');
      });

      it('should accept recovery code and remove it', async () => {
        const user = mockUser({
          twoFactorEnabled: true,
          twoFactorSecret: 'OTP_SECRET_123',
          twoFactorRecoveryCodes: ['RECOVER1', 'RECOVER2'],
        });
        mockUsersRepo.findOne.mockResolvedValue(user);
        mockAuthenticator.verify.mockReturnValue(false);

        const result = await service.verifyTwoFactorToken('token', 'RECOVER1');

        expect(result).toBe(user);
        expect(mockUsersRepo.update).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            twoFactorRecoveryCodes: ['RECOVER2'],
          }),
        );
      });
    });
  });
});
