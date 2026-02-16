import { UnauthorizedException } from '@nestjs/common';
import AuthController from './auth.controller';

/* ─── mocks ────────────────────────────────────────────── */

const mockAuthService = {
  isTwoFactorEnabled: jest.fn(),
  generateTwoFactorToken: jest.fn(),
  verifyTwoFactorToken: jest.fn(),
  verifyTwoFactorForLogin: jest.fn(),
  login: jest.fn(),
};

const mockAuditService = {
  record: jest.fn().mockResolvedValue(undefined),
};

function createController(): AuthController {
  return new (AuthController as any)(mockAuthService, mockAuditService);
}

/* ─── helpers ──────────────────────────────────────────── */

function mockRequest(overrides: Record<string, any> = {}) {
  return {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test-agent' },
    user: { _id: 'user123', email: 'test@example.com' },
    ...overrides,
  };
}

/* ─── tests ────────────────────────────────────────────── */

describe('AuthController - 2FA Flow', () => {
  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = createController();
  });

  describe('login (2FA challenge)', () => {
    it('should return requiresTwoFactor when user has 2FA enabled and no code provided', async () => {
      const req = mockRequest();
      const dto = { email: 'test@example.com', password: 'password123' };

      mockAuthService.isTwoFactorEnabled.mockResolvedValue(true);
      mockAuthService.generateTwoFactorToken.mockResolvedValue('2fa-token-xyz');

      const result = await controller.login(dto, req);

      expect(result).toEqual({
        requiresTwoFactor: true,
        twoFactorToken: '2fa-token-xyz',
        email: 'test@example.com',
      });
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should proceed with login when user has no 2FA enabled', async () => {
      const req = mockRequest();
      const dto = { email: 'test@example.com', password: 'password123' };

      mockAuthService.isTwoFactorEnabled.mockResolvedValue(false);
      mockAuthService.login.mockResolvedValue({
        accessToken: 'jwt-token',
        user: { _id: 'user123', email: 'test@example.com' },
      });

      const result = await controller.login(dto, req);

      expect((result as any).accessToken).toBe('jwt-token');
      expect(mockAuthService.generateTwoFactorToken).not.toHaveBeenCalled();
    });

    it('should verify 2FA code when provided with 2FA enabled', async () => {
      const req = mockRequest();
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        twoFactorCode: '123456',
      };

      mockAuthService.isTwoFactorEnabled.mockResolvedValue(true);
      mockAuthService.verifyTwoFactorForLogin = jest
        .fn()
        .mockResolvedValue(undefined);
      mockAuthService.login.mockResolvedValue({
        accessToken: 'jwt-token',
        user: { _id: 'user123', email: 'test@example.com' },
      });

      const result = await controller.login(dto, req);

      expect(mockAuthService.verifyTwoFactorForLogin).toHaveBeenCalledWith(
        'user123',
        '123456',
      );
      expect((result as any).accessToken).toBe('jwt-token');
    });
  });

  describe('verifyTwoFactor', () => {
    it('should verify and login with valid 2FA token and code', async () => {
      const dto = { twoFactorToken: 'valid-token', code: '123456' };
      const user = { _id: 'user123', email: 'test@example.com' };

      mockAuthService.verifyTwoFactorToken.mockResolvedValue(user);
      mockAuthService.login.mockResolvedValue({
        accessToken: 'jwt-token',
        user,
      });

      const result = await controller.verifyTwoFactor(dto);

      expect(mockAuthService.verifyTwoFactorToken).toHaveBeenCalledWith(
        'valid-token',
        '123456',
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(user);
      expect(result.accessToken).toBe('jwt-token');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        'auth.login.success',
        expect.objectContaining({ userId: 'user123' }),
        null,
        {},
        { via: '2fa' },
      );
    });

    it('should throw BadRequestException when token is missing', async () => {
      const dto = { twoFactorToken: '', code: '123456' };

      await expect(controller.verifyTwoFactor(dto)).rejects.toThrow(
        'Two-factor token is required',
      );
    });

    it('should throw BadRequestException when code is missing', async () => {
      const dto = { twoFactorToken: 'valid-token', code: '' };

      await expect(controller.verifyTwoFactor(dto)).rejects.toThrow(
        'Two-factor code is required',
      );
    });

    it('should throw UnauthorizedException on invalid code', async () => {
      const dto = { twoFactorToken: 'valid-token', code: 'wrong-code' };

      mockAuthService.verifyTwoFactorToken.mockRejectedValue(
        new UnauthorizedException('Invalid two-factor code'),
      );

      await expect(controller.verifyTwoFactor(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
