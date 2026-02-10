import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import UserEntity from '../../entities/UserEntity';
import {
  NotificationType,
  NotificationPriority,
} from '../../entities/NotificationEntity';
import { NotificationsService } from './notifications.service';
import { NextcloudAdapter } from '../integrations/adapters/nextcloud';
import { ZimbraAdapter } from '../integrations/adapters/zimbra.adapter';
import { OutlookAdapter } from '../integrations/adapters/outlook.adapter';

@Injectable()
export class IntegrationNotificationsService {
  private readonly logger = new Logger(IntegrationNotificationsService.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly nextcloud: NextcloudAdapter,
    private readonly zimbra: ZimbraAdapter,
    private readonly outlook: OutlookAdapter,
    @InjectRepository(UserEntity)
    private readonly usersRepo: MongoRepository<UserEntity>,
  ) {}

  // Poll every 5 minutes
  @Cron('*/5 * * * *')
  async pollIntegrations(): Promise<void> {
    await Promise.all([
      this.pollNextcloudActivities(),
      this.pollZimbraEmails(),
      this.pollOutlookEmails(),
      this.pollOutlookEvents(),
      this.pollZimbraCalls(),
    ]);
  }

  private async pollNextcloudActivities(): Promise<void> {
    if (!this.nextcloud.isConfigured()) {
      return;
    }

    const users = await this.getActiveUsers();

    for (const user of users) {
      const latest = await this.notifications.getLatestTimestamp(
        user._id.toString(),
        'nextcloud',
      );

      const since = latest
        ? Math.floor(latest.getTime() / 1000)
        : Math.floor(Date.now() / 1000) - 60 * 60 * 24; // last 24h

      const activities = await this.nextcloud.getActivities({
        since,
        limit: 20,
        sort: 'desc',
      });

      for (const activity of activities) {
        const externalId = `${activity.id}:${user._id.toString()}`;
        const exists = await this.notifications.existsByExternalId(
          'nextcloud',
          externalId,
        );

        if (exists) {
          continue;
        }

        await this.notifications.create({
          userId: user._id.toString(),
          type: NotificationType.INTEGRATION_ACTIVITY,
          title: 'Atividade no NextCloud',
          message:
            activity.subject || activity.message || 'Atividade registrada',
          priority: NotificationPriority.NORMAL,
          source: 'nextcloud',
          externalId,
          link: activity.link,
          actionLabel: 'Abrir',
          actionUrl: activity.link,
          icon: 'nextcloud',
          metadata: activity.metadata,
        });
      }
    }
  }

  private async pollZimbraEmails(): Promise<void> {
    if (!this.zimbra.isConfigured()) {
      return;
    }

    const users = await this.getActiveUsers();

    for (const user of users) {
      const latest = await this.notifications.getLatestTimestamp(
        user._id.toString(),
        'zimbra-mail',
      );

      const emails = await this.zimbra.getUnreadEmails(latest || undefined);

      for (const email of emails) {
        const externalId = `${email.id}:${user._id.toString()}`;
        const exists = await this.notifications.existsByExternalId(
          'zimbra-mail',
          externalId,
        );

        if (exists) {
          continue;
        }

        await this.notifications.create({
          userId: user._id.toString(),
          type: NotificationType.NEW_EMAIL,
          title: 'Novo email',
          message: `${email.from} — ${email.subject}`,
          priority: NotificationPriority.NORMAL,
          source: 'zimbra-mail',
          externalId,
          link: email.link,
          actionLabel: 'Ver email',
          actionUrl: email.link,
          icon: 'mail',
          metadata: {
            from: email.from,
            subject: email.subject,
            receivedAt: email.receivedAt,
          },
        });
      }
    }
  }

  private async pollZimbraCalls(): Promise<void> {
    if (!this.zimbra.isConfigured()) {
      return;
    }

    const users = await this.getActiveUsers();

    for (const user of users) {
      const calls = await this.zimbra.getUpcomingCalls(60);

      for (const call of calls) {
        const externalId = `${call.id}:${user._id.toString()}`;
        const exists = await this.notifications.existsByExternalId(
          'zimbra-call',
          externalId,
        );

        if (exists) {
          continue;
        }

        await this.notifications.create({
          userId: user._id.toString(),
          type: NotificationType.UPCOMING_CALL,
          title: 'Chamada pendente',
          message: `${call.title} • ${new Date(call.startAt).toLocaleString()}`,
          priority: NotificationPriority.HIGH,
          source: 'zimbra-call',
          externalId,
          link: call.link,
          actionLabel: 'Abrir agenda',
          actionUrl: call.link,
          icon: 'calendar',
          metadata: {
            startAt: call.startAt,
            endAt: call.endAt,
            organizer: call.organizer,
          },
        });
      }
    }
  }

  private async pollOutlookEmails(): Promise<void> {
    if (!this.outlook.isConfigured()) {
      return;
    }

    const users = await this.getActiveUsers();

    for (const user of users) {
      const latest = await this.notifications.getLatestTimestamp(
        user._id.toString(),
        'outlook-mail',
      );

      const emails = await this.outlook.getUnreadEmails(latest || undefined);

      for (const email of emails) {
        const externalId = `${email.id}:${user._id.toString()}`;
        const exists = await this.notifications.existsByExternalId(
          'outlook-mail',
          externalId,
        );

        if (exists) {
          continue;
        }

        await this.notifications.create({
          userId: user._id.toString(),
          type: NotificationType.NEW_EMAIL,
          title: 'New email (Outlook)',
          message: `${email.from} — ${email.subject}`,
          priority: NotificationPriority.NORMAL,
          source: 'outlook-mail',
          externalId,
          link: email.link,
          actionLabel: 'Open email',
          actionUrl: email.link,
          icon: 'mail',
          metadata: {
            from: email.from,
            subject: email.subject,
            receivedAt: email.receivedAt,
            hasAttachments: email.hasAttachments,
          },
        });
      }
    }
  }

  private async pollOutlookEvents(): Promise<void> {
    if (!this.outlook.isConfigured()) {
      return;
    }

    const users = await this.getActiveUsers();

    for (const user of users) {
      const events = await this.outlook.getUpcomingEvents(60);

      for (const event of events) {
        const externalId = `${event.id}:${user._id.toString()}`;
        const exists = await this.notifications.existsByExternalId(
          'outlook-event',
          externalId,
        );

        if (exists) {
          continue;
        }

        await this.notifications.create({
          userId: user._id.toString(),
          type: NotificationType.UPCOMING_CALL,
          title: 'Upcoming event (Outlook)',
          message: `${event.subject} • ${new Date(event.startAt).toLocaleString()}`,
          priority: NotificationPriority.HIGH,
          source: 'outlook-event',
          externalId,
          link: event.link,
          actionLabel: 'Open calendar',
          actionUrl: event.link,
          icon: 'calendar',
          metadata: {
            startAt: event.startAt,
            endAt: event.endAt,
            organizer: event.organizer,
            location: event.location,
          },
        });
      }
    }
  }

  private async getActiveUsers(): Promise<UserEntity[]> {
    try {
      return await this.usersRepo.find({
        where: { disabled: false } as any,
      });
    } catch (error) {
      this.logger.error('Failed to load users for notifications:', error);
      return [];
    }
  }
}
