import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Logger,
} from '@nestjs/common';
import PasswordRecoveryService from './password-recovery.service';

interface ForgotPasswordDto {
  email: string;
}

interface ResetPasswordDto {
  token: string;
  password: string;
  confirm: string;
}

@Controller('/auth')
export default class PasswordRecoveryController {
  private readonly logger = new Logger(PasswordRecoveryController.name);

  constructor(private readonly svc: PasswordRecoveryService) {
    try {
      if (!svc) {
        this.logger.error('Service not injected');
        throw new Error('Service initialization failed');
      }
      this.logger.log('PasswordRecoveryController initialized');
    } catch (error) {
      this.logger.error('PasswordRecoveryController constructor error:', error);
      throw error;
    }
  }

  @Post('/forgot-password')
  async forgot(@Body() dto: ForgotPasswordDto, @Req() req: any) {
    try {
      const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || '');
      const ua = String(req?.headers?.['user-agent'] || '');
      return await this.svc.forgot(dto, ip, ua);
    } catch (error) {
      this.logger.error('Error in forgot password:', error);
      throw error;
    }
  }

  @Get('/reset-password/validate')
  async validate(@Query('token') token?: string) {
    try {
      return await this.svc.validate(String(token || ''));
    } catch (error) {
      this.logger.error('Error validating reset token:', error);
      throw error;
    }
  }

  @Post('/reset-password')
  async reset(@Body() dto: ResetPasswordDto) {
    try {
      return await this.svc.reset(dto);
    } catch (error) {
      this.logger.error('Error resetting password:', error);
      throw error;
    }
  }
}
