import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let webhooksService: jest.Mocked<WebhooksService>;

  beforeEach(async () => {
    const mockWebhooksService = {
      verifySignature: jest.fn(),
      handleZimbraWebhook: jest.fn(),
      handleOutlookWebhook: jest.fn(),
      handleNextcloudWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        {
          provide: WebhooksService,
          useValue: mockWebhooksService,
        },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    webhooksService = module.get(WebhooksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXTCLOUD_WEBHOOK_SECRET;
    delete process.env.ZIMBRA_WEBHOOK_SECRET;
  });

  describe('handleNextcloudWebhook', () => {
    const userId = 'test-user-123';
    const payload = {
      event: 'file_created',
      path: '/Documents/report.pdf',
      name: 'report.pdf',
      id: 'file-789',
    };

    it('should process valid Nextcloud webhook', async () => {
      const result = await controller.handleNextcloudWebhook(
        payload,
        undefined,
        userId,
      );

      expect(webhooksService.handleNextcloudWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'nextcloud',
          eventType: 'file_created',
          data: payload,
        }),
        userId,
      );
      expect(result).toEqual({
        status: 'ok',
        message: 'Webhook processed successfully',
      });
    });

    it('should throw BadRequestException when userId is missing', async () => {
      await expect(
        controller.handleNextcloudWebhook(payload, undefined, undefined),
      ).rejects.toThrow(BadRequestException);

      expect(webhooksService.handleNextcloudWebhook).not.toHaveBeenCalled();
    });

    it('should verify signature when secret is configured', async () => {
      process.env.NEXTCLOUD_WEBHOOK_SECRET = 'test-secret';
      webhooksService.verifySignature.mockReturnValue(true);
      const signature = 'valid-signature-hash';

      const result = await controller.handleNextcloudWebhook(
        payload,
        signature,
        userId,
      );

      expect(webhooksService.verifySignature).toHaveBeenCalledWith(
        JSON.stringify(payload),
        signature,
        'test-secret',
      );
      expect(webhooksService.handleNextcloudWebhook).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('should reject invalid signature', async () => {
      process.env.NEXTCLOUD_WEBHOOK_SECRET = 'test-secret';
      webhooksService.verifySignature.mockReturnValue(false);
      const signature = 'invalid-signature';

      await expect(
        controller.handleNextcloudWebhook(payload, signature, userId),
      ).rejects.toThrow(UnauthorizedException);

      expect(webhooksService.handleNextcloudWebhook).not.toHaveBeenCalled();
    });

    it('should reject request with missing signature when secret is configured', async () => {
      process.env.NEXTCLOUD_WEBHOOK_SECRET = 'test-secret';

      await expect(
        controller.handleNextcloudWebhook(payload, undefined, userId),
      ).rejects.toThrow(UnauthorizedException);

      expect(webhooksService.verifySignature).not.toHaveBeenCalled();
      expect(webhooksService.handleNextcloudWebhook).not.toHaveBeenCalled();
    });

    it('should allow requests without signature when no secret configured', async () => {
      const result = await controller.handleNextcloudWebhook(
        payload,
        undefined,
        userId,
      );

      expect(webhooksService.verifySignature).not.toHaveBeenCalled();
      expect(webhooksService.handleNextcloudWebhook).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('should extract event type from payload.event', async () => {
      const customPayload = { event: 'file_shared', data: {} };

      await controller.handleNextcloudWebhook(customPayload, undefined, userId);

      expect(webhooksService.handleNextcloudWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'file_shared',
        }),
        userId,
      );
    });

    it('should extract event type from payload.type as fallback', async () => {
      const customPayload = { type: 'file_deleted', data: {} };

      await controller.handleNextcloudWebhook(customPayload, undefined, userId);

      expect(webhooksService.handleNextcloudWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'file_deleted',
        }),
        userId,
      );
    });

    it('should default to "unknown" event type when neither event nor type present', async () => {
      const customPayload = { data: { some: 'data' } };

      await controller.handleNextcloudWebhook(customPayload, undefined, userId);

      expect(webhooksService.handleNextcloudWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'unknown',
        }),
        userId,
      );
    });

    it('should include signature in event object', async () => {
      const signature = 'test-signature-value';

      await controller.handleNextcloudWebhook(payload, signature, userId);

      expect(webhooksService.handleNextcloudWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          signature,
        }),
        userId,
      );
    });

    it('should set correct source as nextcloud', async () => {
      await controller.handleNextcloudWebhook(payload, undefined, userId);

      expect(webhooksService.handleNextcloudWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'nextcloud',
        }),
        userId,
      );
    });

    it('should handle complex nested payload', async () => {
      const complexPayload = {
        event: 'file_created',
        file: {
          id: 123,
          path: '/nested/path/file.txt',
          metadata: {
            size: 1024,
            mimeType: 'text/plain',
          },
        },
      };

      await controller.handleNextcloudWebhook(
        complexPayload,
        undefined,
        userId,
      );

      expect(webhooksService.handleNextcloudWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          data: complexPayload,
        }),
        userId,
      );
    });
  });

  describe('handleZimbraWebhook', () => {
    const userId = 'zimbra-user';
    const payload = {
      eventType: 'mail.new',
      data: { id: 'msg-123', subject: 'Test' },
      timestamp: '2026-02-10T12:00:00Z',
    };

    it('should process valid Zimbra webhook', async () => {
      const result = await controller.handleZimbraWebhook(
        payload,
        undefined,
        userId,
      );

      expect(webhooksService.handleZimbraWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'zimbra',
          eventType: 'mail.new',
        }),
        userId,
      );
      expect(result.status).toBe('ok');
    });

    it('should verify Zimbra signature when configured', async () => {
      process.env.ZIMBRA_WEBHOOK_SECRET = 'zimbra-secret';
      webhooksService.verifySignature.mockReturnValue(true);

      await controller.handleZimbraWebhook(payload, 'valid-sig', userId);

      expect(webhooksService.verifySignature).toHaveBeenCalledWith(
        JSON.stringify(payload),
        'valid-sig',
        'zimbra-secret',
      );
    });

    it('should throw BadRequestException when userId missing', async () => {
      await expect(
        controller.handleZimbraWebhook(payload, undefined, undefined),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleOutlookWebhook', () => {
    const payload = {
      value: [
        {
          subscriptionId: 'sub-123',
          clientState: 'secret-state',
          changeType: 'created',
          resource: 'users/abc-123-def/messages/msg-456',
          resourceData: {
            '@odata.type': '#microsoft.graph.message',
            id: 'msg-456',
          },
        },
      ],
    };

    it('should process Outlook webhook notifications', async () => {
      const result = await controller.handleOutlookWebhook(payload, undefined);

      expect(webhooksService.handleOutlookWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'outlook',
          eventType: 'created',
        }),
        'abc-123-def',
      );
      expect(result.status).toBe('ok');
    });

    it('should verify client state when configured', async () => {
      process.env.OUTLOOK_WEBHOOK_CLIENT_STATE = 'expected-state';

      await expect(
        controller.handleOutlookWebhook(payload, 'wrong-state'),
      ).rejects.toThrow(UnauthorizedException);

      delete process.env.OUTLOOK_WEBHOOK_CLIENT_STATE;
    });

    it('should extract userId from resource string', async () => {
      delete process.env.OUTLOOK_WEBHOOK_CLIENT_STATE;

      await controller.handleOutlookWebhook(payload, undefined);

      expect(webhooksService.handleOutlookWebhook).toHaveBeenCalledWith(
        expect.anything(),
        'abc-123-def',
      );
    });
  });

  describe('handleOutlookValidation', () => {
    it('should return validation token for subscription validation', () => {
      const token = 'validation-token-12345';

      const result = controller.handleOutlookValidation(token);

      expect(result).toBe(token);
    });

    it('should return status ok when no validation token', () => {
      const result = controller.handleOutlookValidation(undefined);

      expect(result).toEqual({
        status: 'ok',
        message: 'Outlook webhook endpoint ready',
      });
    });
  });
});
