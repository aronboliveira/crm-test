import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import MailOutboxEntity from '../../entities/MailOutboxEntity';
import EmailDeliveryService, { EMAIL_GATEWAY } from './email-delivery.service';
import MockEmailGateway from './mock-email.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([MailOutboxEntity])],
  providers: [
    MockEmailGateway,
    { provide: EMAIL_GATEWAY, useExisting: MockEmailGateway },
    EmailDeliveryService,
  ],
  exports: [EmailDeliveryService],
})
export default class NotificationsModule {}
