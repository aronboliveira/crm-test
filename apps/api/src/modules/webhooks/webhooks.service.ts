import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/NotificationEntity';
import * as crypto from 'crypto-js';

export interface WebhookEvent {
  source: 'zimbra' | 'outlook';
  eventType: string;
  data: any;
  timestamp: Date;
  signature?: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Verify webhook signature to ensure authenticity
   */
  verifySignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto.HmacSHA256(payload, secret).toString();
    return expectedSignature === signature;
  }

  /**
   * Handle incoming Zimbra webhook events
   */
  async handleZimbraWebhook(event: WebhookEvent, userId: string) {
    this.logger.log(
      `Processing Zimbra webhook: ${event.eventType} for user ${userId}`,
    );

    try {
      switch (event.eventType) {
        case 'mail.new':
          await this.handleNewEmail(event.data, userId, 'zimbra');
          break;
        case 'calendar.event':
          await this.handleCalendarEvent(event.data, userId, 'zimbra');
          break;
        case 'calendar.reminder':
          await this.handleCalendarReminder(event.data, userId, 'zimbra');
          break;
        case 'task.assigned':
          await this.handleTaskAssigned(event.data, userId, 'zimbra');
          break;
        default:
          this.logger.warn(`Unknown Zimbra event type: ${event.eventType}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing Zimbra webhook: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle incoming Outlook webhook events (Microsoft Graph change notifications)
   */
  async handleOutlookWebhook(event: WebhookEvent, userId: string) {
    this.logger.log(
      `Processing Outlook webhook: ${event.eventType} for user ${userId}`,
    );

    try {
      switch (event.eventType) {
        case 'created':
          await this.handleOutlookCreated(event.data, userId);
          break;
        case 'updated':
          await this.handleOutlookUpdated(event.data, userId);
          break;
        case 'deleted':
          await this.handleOutlookDeleted(event.data, userId);
          break;
        default:
          this.logger.warn(`Unknown Outlook event type: ${event.eventType}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing Outlook webhook: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle new email event
   */
  private async handleNewEmail(
    data: any,
    userId: string,
    source: 'zimbra' | 'outlook',
  ) {
    const externalId = `${source}-email-${data.id}`;

    // Check if already processed
    const exists =
      await this.notificationsService.existsByExternalId(externalId);
    if (exists) {
      this.logger.debug(`Email notification already exists: ${externalId}`);
      return;
    }

    await this.notificationsService.create({
      type: NotificationType.NEW_EMAIL,
      userId,
      title: `New email from ${data.from}`,
      message: data.subject,
      source,
      externalId,
      link: data.webLink,
      icon: 'mail',
      metadata: {
        from: data.from,
        hasAttachments: data.hasAttachments,
      },
    });

    this.logger.log(`Created notification for new email: ${externalId}`);
  }

  /**
   * Handle calendar event
   */
  private async handleCalendarEvent(
    data: any,
    userId: string,
    source: 'zimbra' | 'outlook',
  ) {
    const externalId = `${source}-calendar-${data.id}`;

    const exists =
      await this.notificationsService.existsByExternalId(externalId);
    if (exists) return;

    await this.notificationsService.create({
      type: NotificationType.CALENDAR_EVENT,
      userId,
      title: 'New calendar event',
      message: data.subject || data.name,
      source,
      externalId,
      link: data.webLink,
      icon: 'calendar',
      metadata: {
        start: data.start,
        end: data.end,
        location: data.location,
      },
    });

    this.logger.log(`Created notification for calendar event: ${externalId}`);
  }

  /**
   * Handle calendar reminder
   */
  private async handleCalendarReminder(
    data: any,
    userId: string,
    source: 'zimbra' | 'outlook',
  ) {
    const externalId = `${source}-reminder-${data.id}-${Date.now()}`;

    await this.notificationsService.create({
      type: NotificationType.UPCOMING_CALL,
      userId,
      title: `Reminder: ${data.subject}`,
      message: `Starting in ${data.minutesBeforeStart} minutes`,
      priority: 'high',
      source,
      externalId,
      link: data.webLink,
      icon: 'bell',
      metadata: {
        startTime: data.start,
        minutesBeforeStart: data.minutesBeforeStart,
      },
    });

    this.logger.log(`Created reminder notification: ${externalId}`);
  }

  /**
   * Handle task assigned
   */
  private async handleTaskAssigned(
    data: any,
    userId: string,
    source: 'zimbra' | 'outlook',
  ) {
    const externalId = `${source}-task-${data.id}`;

    const exists =
      await this.notificationsService.existsByExternalId(externalId);
    if (exists) return;

    await this.notificationsService.create({
      type: NotificationType.TASK_ASSIGNED,
      userId,
      title: 'New task assigned',
      message: data.subject || data.title,
      source,
      externalId,
      link: data.webLink,
      icon: 'task',
      metadata: {
        dueDate: data.dueDate,
        priority: data.priority,
      },
    });

    this.logger.log(`Created notification for task: ${externalId}`);
  }

  /**
   * Handle Outlook created event
   */
  private async handleOutlookCreated(data: any, userId: string) {
    const resourceData = data.resourceData;
    const resourceType = resourceData['@odata.type'];

    if (resourceType === '#microsoft.graph.message') {
      await this.handleNewEmail(resourceData, userId, 'outlook');
    } else if (resourceType === '#microsoft.graph.event') {
      await this.handleCalendarEvent(resourceData, userId, 'outlook');
    } else if (resourceType === '#microsoft.graph.todoTask') {
      await this.handleTaskAssigned(resourceData, userId, 'outlook');
    }
  }

  /**
   * Handle Outlook updated event
   */
  private async handleOutlookUpdated(data: any, userId: string) {
    this.logger.debug(
      `Outlook resource updated: ${data.resourceData['@odata.type']}`,
    );
    // Could implement update notifications if needed
  }

  /**
   * Handle Outlook deleted event
   */
  private async handleOutlookDeleted(data: any, userId: string) {
    this.logger.debug(
      `Outlook resource deleted: ${data.resourceData['@odata.type']}`,
    );
    // Could implement deletion tracking if needed
  }
}
