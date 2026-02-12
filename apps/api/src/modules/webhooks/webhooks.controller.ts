import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Query,
  Get,
  Logger,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import SafeJsonUtil from '../../common/json/safe-json.util';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Zimbra webhook endpoint
   * POST /webhooks/zimbra?userId=xxx
   *
   * Expected payload:
   * {
   *   "eventType": "mail.new" | "calendar.event" | "calendar.reminder" | "task.assigned",
   *   "data": { ... },
   *   "timestamp": "2026-02-09T12:00:00Z"
   * }
   */
  @Post('zimbra')
  @HttpCode(HttpStatus.OK)
  async handleZimbraWebhook(
    @Body() payload: any,
    @Headers('x-zimbra-signature') signature: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('userId query parameter is required');
    }

    this.logger.log(`Received Zimbra webhook for user ${userId}`);

    // Verify signature if configured
    const secret = process.env.ZIMBRA_WEBHOOK_SECRET;
    if (secret && signature) {
      const payloadString = SafeJsonUtil.tryStringify(payload);
      if (!payloadString) {
        this.logger.warn('Unable to serialize Zimbra webhook payload');
        throw new BadRequestException('Invalid webhook payload');
      }
      const isValid = this.webhooksService.verifySignature(
        payloadString,
        signature,
        secret,
      );

      if (!isValid) {
        this.logger.warn('Invalid Zimbra webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    const event = {
      source: 'zimbra' as const,
      eventType: payload.eventType,
      data: payload.data,
      timestamp: new Date(payload.timestamp),
      signature,
    };

    await this.webhooksService.handleZimbraWebhook(event, userId);

    return { status: 'ok', message: 'Webhook processed successfully' };
  }

  /**
   * Outlook webhook endpoint (Microsoft Graph change notifications)
   * POST /webhooks/outlook
   *
   * Microsoft Graph sends validation requests first:
   * GET /webhooks/outlook?validationToken=xxx
   *
   * Expected payload:
   * {
   *   "value": [{
   *     "subscriptionId": "xxx",
   *     "clientState": "secretClientValue",
   *     "changeType": "created" | "updated" | "deleted",
   *     "resource": "users/{userId}/messages/{id}",
   *     "resourceData": { ... }
   *   }]
   * }
   */
  @Get('outlook')
  handleOutlookValidation(@Query('validationToken') validationToken: string) {
    // Microsoft Graph subscription validation
    if (validationToken) {
      this.logger.log('Responding to Outlook webhook validation');
      return validationToken;
    }

    return { status: 'ok', message: 'Outlook webhook endpoint ready' };
  }

  @Post('outlook')
  @HttpCode(HttpStatus.OK)
  async handleOutlookWebhook(
    @Body() payload: any,
    @Headers('x-ms-client-state') clientState: string,
  ) {
    this.logger.log('Received Outlook webhook');

    // Verify client state if configured
    const expectedClientState = process.env.OUTLOOK_WEBHOOK_CLIENT_STATE;
    if (expectedClientState && clientState !== expectedClientState) {
      this.logger.warn('Invalid Outlook webhook client state');
      throw new UnauthorizedException('Invalid client state');
    }

    // Microsoft Graph sends array of notifications
    const notifications = payload.value || [];

    for (const notification of notifications) {
      // Extract userId from resource string (e.g., "users/abc123/messages/xyz")
      const userId = this.extractUserIdFromResource(notification.resource);

      if (!userId) {
        this.logger.warn(
          `Could not extract userId from resource: ${notification.resource}`,
        );
        continue;
      }

      const event = {
        source: 'outlook' as const,
        eventType: notification.changeType,
        data: notification,
        timestamp: new Date(),
      };

      await this.webhooksService.handleOutlookWebhook(event, userId);
    }

    return { status: 'ok', message: 'Webhook processed successfully' };
  }

  /**
   * Nextcloud webhook endpoint
   * POST /webhooks/nextcloud?userId=xxx
   *
   * Nextcloud webhook requests may include a signature header (e.g. `x-nextcloud-signature`).
   * We verify using an HMAC secret configured in `NEXTCLOUD_WEBHOOK_SECRET`.
   * Payload format depends on the Nextcloud webhook/app used; we expect a JSON body with
   * `event`/`type` and `file`/`path` information.
   */
  @Post('nextcloud')
  @HttpCode(HttpStatus.OK)
  async handleNextcloudWebhook(
    @Body() payload: any,
    @Headers('x-nextcloud-signature') signature: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('userId query parameter is required');
    }

    this.logger.log(`Received Nextcloud webhook for user ${userId}`);

    const secret = process.env.NEXTCLOUD_WEBHOOK_SECRET;
    if (secret) {
      if (!signature) {
        this.logger.warn('Missing Nextcloud webhook signature');
        throw new UnauthorizedException('Missing webhook signature');
      }

      const payloadString = SafeJsonUtil.tryStringify(payload);
      if (!payloadString) {
        this.logger.warn('Unable to serialize Nextcloud webhook payload');
        throw new BadRequestException('Invalid webhook payload');
      }
      const isValid = this.webhooksService.verifySignature(
        payloadString,
        signature,
        secret,
      );

      if (!isValid) {
        this.logger.warn('Invalid Nextcloud webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    const event = {
      source: 'nextcloud' as const,
      eventType: payload.event || payload.type || 'unknown',
      data: payload,
      timestamp: new Date(),
      signature,
    };

    await this.webhooksService.handleNextcloudWebhook(event, userId);

    return { status: 'ok', message: 'Webhook processed successfully' };
  }

  /**
   * Extract userId from Microsoft Graph resource string
   * Example: "users/abc-123-def/messages/xyz" -> "abc-123-def"
   */
  private extractUserIdFromResource(resource: string): string | null {
    const match = resource.match(/users\/([^\/]+)/);
    return match ? match[1] : null;
  }
}
