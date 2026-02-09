import { UnauthorizedException } from '@nestjs/common';
import AuthService from './auth.service';
import bcrypt from 'bcryptjs';

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
});
