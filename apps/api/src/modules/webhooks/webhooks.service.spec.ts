import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationType,
  NotificationPriority,
} from '../../entities/NotificationEntity';
import * as crypto from 'crypto';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const mockNotificationsService = {
      create: jest.fn(),
      existsByExternalId: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifySignature', () => {
    it('should return true for valid HMAC signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret-key';
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const result = service.verifySignature(
        payload,
        expectedSignature,
        secret,
      );

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret-key';
      const invalidSignature = 'invalid-signature-12345';

      const result = service.verifySignature(payload, invalidSignature, secret);

      expect(result).toBe(false);
    });

    it('should return false when signature does not match payload', () => {
      const payload = JSON.stringify({ test: 'data' });
      const differentPayload = JSON.stringify({ test: 'different' });
      const secret = 'test-secret-key';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(differentPayload)
        .digest('hex');

      const result = service.verifySignature(payload, signature, secret);

      expect(result).toBe(false);
    });

    it('should be case-sensitive for signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret-key';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      const uppercaseSignature = signature.toUpperCase();

      const result = service.verifySignature(
        payload,
        uppercaseSignature,
        secret,
      );

      expect(result).toBe(false);
    });
  });

  describe('handleNextcloudWebhook', () => {
    const userId = 'user-123';

    it('should handle file created event', async () => {
      const event = {
        source: 'zimbra' as const,
        eventType: 'file_created',
        data: {
          id: 'file-456',
          name: 'document.pdf',
          path: '/Documents/document.pdf',
          url: 'https://nextcloud.example/f/456',
        },
        timestamp: new Date(),
      };

      await service.handleNextcloudWebhook(event, userId);

      expect(notificationsService.existsByExternalId).toHaveBeenCalledWith(
        'nextcloud',
        'nextcloud-file-updated-file-456',
      );
      expect(notificationsService.create).toHaveBeenCalledWith({
        type: NotificationType.FILE_UPDATED,
        userId,
        title: 'File updated',
        message: 'document.pdf',
        source: 'nextcloud',
        externalId: 'nextcloud-file-updated-file-456',
        link: 'https://nextcloud.example/f/456',
        icon: 'file',
        metadata: event.data,
      });
    });

    it('should handle file added event', async () => {
      const event = {
        source: 'zimbra' as const,
        eventType: 'file_added',
        data: {
          path: '/Photos/vacation.jpg',
          name: 'vacation.jpg',
        },
        timestamp: new Date(),
      };

      await service.handleNextcloudWebhook(event, userId);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.FILE_UPDATED,
          title: 'File updated',
          message: 'vacation.jpg',
        }),
      );
    });

    it('should handle file deleted event', async () => {
      const event = {
        source: 'zimbra' as const,
        eventType: 'file_deleted',
        data: {
          id: 'file-789',
          name: 'old-report.xlsx',
          path: '/Reports/old-report.xlsx',
        },
        timestamp: new Date(),
      };

      await service.handleNextcloudWebhook(event, userId);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.INTEGRATION_ACTIVITY,
          title: 'File deleted',
          message: 'old-report.xlsx',
          source: 'nextcloud',
          icon: 'trash',
        }),
      );
    });

    it('should handle file removed event', async () => {
      const event = {
        source: 'zimbra' as const,
        eventType: 'removed',
        data: {
          path: '/temp/file.txt',
        },
        timestamp: new Date(),
      };

      await service.handleNextcloudWebhook(event, userId);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.INTEGRATION_ACTIVITY,
          title: 'File deleted',
        }),
      );
    });

    it('should handle file shared event', async () => {
      const event = {
        source: 'zimbra' as const,
        eventType: 'file_shared',
        data: {
          id: 'share-101',
          name: 'presentation.pptx',
          path: '/Shared/presentation.pptx',
          url: 'https://nextcloud.example/s/abc123',
        },
        timestamp: new Date(),
      };

      await service.handleNextcloudWebhook(event, userId);

      expect(notificationsService.existsByExternalId).toHaveBeenCalledWith(
        'nextcloud',
        'nextcloud-file-shared-share-101',
      );
      expect(notificationsService.create).toHaveBeenCalledWith({
        type: NotificationType.FILE_SHARED,
        userId,
        title: 'File shared',
        message: 'presentation.pptx',
        source: 'nextcloud',
        externalId: 'nextcloud-file-shared-share-101',
        link: 'https://nextcloud.example/s/abc123',
        icon: 'share',
        metadata: event.data,
      });
    });

    it('should handle share event variant', async () => {
      const event = {
        source: 'zimbra' as const,
        eventType: 'share',
        data: {
          path: '/Documents/contract.pdf',
          name: 'contract.pdf',
        },
        timestamp: new Date(),
      };

      await service.handleNextcloudWebhook(event, userId);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.FILE_SHARED,
          title: 'File shared',
        }),
      );
    });

    it('should skip duplicate file events', async () => {
      notificationsService.existsByExternalId.mockResolvedValue(true);

      const event = {
        source: 'zimbra' as const,
        eventType: 'file_created',
        data: {
          id: 'file-duplicate',
          name: 'duplicate.txt',
        },
        timestamp: new Date(),
      };

      await service.handleNextcloudWebhook(event, userId);

      expect(notificationsService.existsByExternalId).toHaveBeenCalled();
      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('should log warning for unknown event types', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      const event = {
        source: 'zimbra' as const,
        eventType: 'unknown_event_type',
        data: {},
        timestamp: new Date(),
      };

      await service.handleNextcloudWebhook(event, userId);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown Nextcloud event type'),
      );
      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('should handle events with minimal data', async () => {
      const event = {
        source: 'zimbra' as const,
        eventType: 'file',
        data: {},
        timestamp: new Date(),
      };

      await service.handleNextcloudWebhook(event, userId);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.FILE_UPDATED,
          message: 'A file was updated',
        }),
      );
    });

    it('should propagate errors from notifications service', async () => {
      notificationsService.create.mockRejectedValue(
        new Error('Database error'),
      );

      const event = {
        source: 'zimbra' as const,
        eventType: 'file_created',
        data: { id: 'file-999' },
        timestamp: new Date(),
      };

      await expect(
        service.handleNextcloudWebhook(event, userId),
      ).rejects.toThrow('Database error');
    });

    it('should be case-insensitive for event type matching', async () => {
      const event = {
        source: 'zimbra' as const,
        eventType: 'FILE_CREATED',
        data: {
          id: 'case-test',
          name: 'test.txt',
        },
        timestamp: new Date(),
      };

      await service.handleNextcloudWebhook(event, userId);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.FILE_UPDATED,
        }),
      );
    });
  });

  describe('handleZimbraWebhook', () => {
    it('should handle new email event', async () => {
      const event = {
        source: 'zimbra' as const,
        eventType: 'mail.new',
        data: {
          id: 'msg-123',
          from: 'sender@example.com',
          subject: 'Test Email',
          webLink: 'https://zimbra.example/mail/123',
          hasAttachments: true,
        },
        timestamp: new Date(),
      };

      await service.handleZimbraWebhook(event, 'user-123');

      expect(notificationsService.create).toHaveBeenCalledWith({
        type: NotificationType.NEW_EMAIL,
        userId: 'user-123',
        title: 'New email from sender@example.com',
        message: 'Test Email',
        source: 'zimbra',
        externalId: 'zimbra-email-msg-123',
        link: 'https://zimbra.example/mail/123',
        icon: 'mail',
        metadata: {
          from: 'sender@example.com',
          hasAttachments: true,
        },
      });
    });
  });

  describe('handleOutlookWebhook', () => {
    it('should handle created message event', async () => {
      const event = {
        source: 'outlook' as const,
        eventType: 'created',
        data: {
          resourceData: {
            '@odata.type': '#microsoft.graph.message',
            id: 'msg-456',
            from: 'user@contoso.com',
            subject: 'Meeting Notes',
            webLink: 'https://outlook.office365.com/mail/456',
            hasAttachments: false,
          },
        },
        timestamp: new Date(),
      };

      await service.handleOutlookWebhook(event, 'user-456');

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.NEW_EMAIL,
          source: 'outlook',
        }),
      );
    });
  });
});
