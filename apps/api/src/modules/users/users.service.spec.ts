import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import UsersService from './users.service';

const fakeOid = '507f1f77bcf86cd799439011';

const mockUsersRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
};

const mockPreferencesRepo = {
  findOne: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
};

function createService() {
  process.env.UPLOADS_DIR = '/tmp/crm-uploads-tests';
  return new (UsersService as any)(
    mockUsersRepo,
    mockPreferencesRepo,
  ) as UsersService;
}

function mockUser(overrides: Record<string, any> = {}) {
  return {
    _id: fakeOid,
    email: 'user@corp.local',
    username: 'user',
    passwordHash: '$2b$12$FAKEHASHVALUE',
    tokenVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService();
  });

  describe('getProfileByUserId', () => {
    it('includes twoFactorEnabled in returned profile', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(
          mockUser({ twoFactorEnabled: true, emailVerified: true }) as any,
        );

      const profile = await service.getProfileByUserId(fakeOid);
      expect(profile.twoFactorEnabled).toBe(true);
      expect(profile.emailVerified).toBe(true);
    });

    it('throws NotFoundException when user does not exist', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null);

      await expect(service.getProfileByUserId(fakeOid)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPreferencesByUserId', () => {
    it('returns defaults when preferences do not exist', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(mockUser() as any);
      mockPreferencesRepo.findOne.mockResolvedValue(null);

      const prefs = await service.getPreferencesByUserId(fakeOid);

      expect(prefs.theme).toBe('system');
      expect(prefs.notifications).toEqual({
        email: true,
        browser: true,
        taskDue: true,
        mentions: true,
        security: true,
        product: false,
      });
    });
  });

  describe('updatePreferencesByUserId', () => {
    it('merges partial notification payload with existing preferences', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(mockUser() as any);
      mockPreferencesRepo.findOne.mockResolvedValue({ _id: fakeOid });

      jest
        .spyOn(service, 'getPreferencesByUserId')
        .mockResolvedValueOnce({
          theme: 'system',
          notifications: {
            email: true,
            browser: true,
            taskDue: true,
            mentions: false,
            security: true,
            product: false,
          },
        } as any)
        .mockResolvedValueOnce({
          theme: 'dark',
          notifications: {
            email: false,
            browser: true,
            taskDue: true,
            mentions: false,
            security: true,
            product: false,
          },
        } as any);

      const result = await service.updatePreferencesByUserId(fakeOid, {
        theme: 'dark',
        notifications: { email: false },
      });

      expect(mockPreferencesRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          theme: 'dark',
          notifyEmail: false,
          notifyBrowser: true,
          notifyTaskDue: true,
          notifyMentions: false,
          notifySecurity: true,
          notifyProduct: false,
        }),
      );
      expect(result.theme).toBe('dark');
    });
  });

  describe('exportUserDataByUserId', () => {
    it('exports profile, preferences, and security metadata', async () => {
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(
          mockUser({ twoFactorEnabled: true, emailVerified: true }) as any,
        );
      jest.spyOn(service, 'getPreferencesByUserId').mockResolvedValue({
        theme: 'light',
        notifications: {
          email: true,
          browser: false,
          taskDue: true,
          mentions: true,
          security: true,
          product: false,
        },
      } as any);

      const data = await service.exportUserDataByUserId(fakeOid);

      expect(data).toHaveProperty('exportedAt');
      expect((data as any).security).toEqual({
        emailVerified: true,
        twoFactorEnabled: true,
      });
      expect((data as any).preferences.theme).toBe('light');
      expect((data as any).notifications.browser).toBe(false);
    });
  });

  describe('deleteAccountByUserId', () => {
    it('throws UnauthorizedException when password is invalid', async () => {
      const hash = await bcrypt.hash('Valid#123', 10);
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(mockUser({ passwordHash: hash }) as any);

      await expect(
        service.deleteAccountByUserId(fakeOid, 'Wrong#123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('anonymizes and disables user account when password is valid', async () => {
      const hash = await bcrypt.hash('Valid#123', 10);
      jest.spyOn(service, 'findById').mockResolvedValue(
        mockUser({
          passwordHash: hash,
          twoFactorEnabled: true,
          tokenVersion: 4,
        }) as any,
      );

      const result = await service.deleteAccountByUserId(fakeOid, 'Valid#123');

      expect(result).toEqual({ ok: true });
      expect(mockUsersRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          disabled: true,
          lockedReason: 'account_deleted_by_user',
          twoFactorEnabled: false,
          roles: ['viewer'],
          tokenVersion: 5,
        }),
      );
    });
  });
});
