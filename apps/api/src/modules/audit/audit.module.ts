import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import AuthAuditEventEntity from '../../entities/AuthAuditEventEntity';
import PasswordResetRequestEntity from '../../entities/PasswordResetRequestEntity';
import AuthAuditService from './auth-audit.service';
import AuditRetentionService from './audit-retention.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuthAuditEventEntity,
      PasswordResetRequestEntity,
    ]),
  ],
  providers: [AuthAuditService, AuditRetentionService],
  exports: [AuthAuditService],
})
export default class AuditModule {}
