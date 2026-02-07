import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import UserEntity from '../../entities/UserEntity';
import AuthAuditEventEntity from '../../entities/AuthAuditEventEntity';
import PasswordResetRequestEntity from '../../entities/PasswordResetRequestEntity';

import MailOutboxEntity from '../../entities/MailOutboxEntity';
import AuditModule from '../audit/audit.module';

import UserAdminController from './users/user-admin.controller';
import UserAdminService from './users/user-admin.service';

import AuditAdminController from './audit/audit-admin.controller';
import AuditAdminService from './audit/audit-admin.service';

import PasswordHashService from '../auth/passowrd-hash.service';
import ResetInviteStrategy from './users/provisioning/reset-invite.strategy';
import UserProvisioningService, {
  USER_PROVISIONING_STRATEGIES,
} from './users/user-provisioning.service';
import NotificationsModule from '../notifications/notificatiions.module';
import MailAdminController from './mail/mail-admin.controller';
import MailAdminService from './mail/mail-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AuthAuditEventEntity,
      PasswordResetRequestEntity,
      MailOutboxEntity,
    ]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [UserAdminController, AuditAdminController, MailAdminController],
  providers: [
    PasswordHashService,
    ResetInviteStrategy,
    {
      provide: USER_PROVISIONING_STRATEGIES,
      useFactory: (s1: ResetInviteStrategy) => [s1],
      inject: [ResetInviteStrategy],
    },
    UserProvisioningService,
    UserAdminService,
    AuditAdminService,
    MailAdminService,
  ],
})
export default class AdminModule {}
