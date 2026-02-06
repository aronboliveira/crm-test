import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import UsersModule from '../users/users.module';
import RbacModule from '../rbac/rbac.module';

import AuthController from './auth.controller';
import AuthService from './auth.service';
import JwtStrategy from './strategies/jwt.strategy';
import LocalStrategy from './strategies/local.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import UserEntity from 'src/entities/UserEntity';
import PasswordResetRequestEntity from 'src/entities/PasswordResetRequestEntity';
import PasswordRecoveryController from './recovery/password-recovery.controller';
import { RESET_DELIVERY_PORT } from './recovery/ports/reset-delivery.token';
import DevReturnResetDeliveryService from './recovery/adapters/DevReturnResetDeliveryService';
import PasswordRecoveryService from './recovery/password-recovery.service';
import { resetDeliveryFactory } from './recovery/adapters/reset-delivery.factory';
import AuditModule from '../audit/audit.module';

@Module({
  imports: [
    UsersModule,
    RbacModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_secret_change_me',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES || '8h') as any,
      },
    }),
    TypeOrmModule.forFeature([UserEntity, PasswordResetRequestEntity]),
    AuditModule,
  ],
  controllers: [AuthController, PasswordRecoveryController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    PasswordRecoveryService,
    { provide: RESET_DELIVERY_PORT, useClass: resetDeliveryFactory() },
  ],
  exports: [AuthService],
})
export default class AuthModule {}
