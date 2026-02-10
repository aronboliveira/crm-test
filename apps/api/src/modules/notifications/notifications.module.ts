import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import MailOutboxEntity from '../../entities/MailOutboxEntity';
import NotificationEntity from '../../entities/NotificationEntity';
import UserEntity from '../../entities/UserEntity';
import EmailDeliveryService, { EMAIL_GATEWAY } from './email-delivery.service';
import MockEmailGateway from './mock-email.gateway';
import SmtpEmailGateway from './smtp-email.gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { IntegrationNotificationsService } from './integration-notifications.service';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MailOutboxEntity,
      NotificationEntity,
      UserEntity,
    ]),
    IntegrationsModule,
  ],
  providers: [
    MockEmailGateway,
    SmtpEmailGateway,
    {
      provide: EMAIL_GATEWAY,
      useFactory: (smtp: SmtpEmailGateway, mock: MockEmailGateway) => {
        const smtpEnabled =
          process.env.SMTP_ENABLED === '1' ||
          process.env.ZIMBRA_SMTP_HOST ||
          process.env.OUTLOOK_SMTP_HOST ||
          process.env.SMTP_HOST;
        return smtpEnabled ? smtp : mock;
      },
      inject: [SmtpEmailGateway, MockEmailGateway],
    },
    EmailDeliveryService,
    NotificationsService,
    IntegrationNotificationsService,
  ],
  controllers: [NotificationsController],
  exports: [EmailDeliveryService, NotificationsService],
})
export default class NotificationsModule {}
