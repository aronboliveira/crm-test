import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Req,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import AuthService from './auth.service';
import LocalAuthGuard from './guards/local-auth.guard';
import JwtAuthGuard from './guards/jwt-auth.guard';
import AuthAuditService from '../audit/auth-audit.service';

interface LoginDto {
  email: string;
  password: string;
}

interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

interface ChangeEmailDto {
  newEmail: string;
  password: string;
}

@Controller('/auth')
export default class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly audit: AuthAuditService,
  ) {
    try {
      if (!auth || !audit) {
        this.logger.error('One or more services not injected');
        throw new Error('Service initialization failed');
      }
      this.logger.log('AuthController initialized');
    } catch (error) {
      this.logger.error('AuthController constructor error:', error);
      throw error;
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    try {
      const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || '');
      const ua = String(req?.headers?.['user-agent'] || '');
      const email = String(dto?.email || '')
        .trim()
        .toLowerCase();

      if (!req.user) {
        throw new UnauthorizedException('Authentication failed');
      }

      const r = await this.auth.login(req.user);

      await this.audit.record(
        'auth.login.success',
        {
          userId: r?.user?._id ? String(r.user._id) : null,
          email: r?.user?.email ? String(r.user.email) : email || null,
        },
        null,
        { ip, ua },
        { via: 'password' },
      );

      return r;
    } catch (e: any) {
      const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || '');
      const ua = String(req?.headers?.['user-agent'] || '');
      const email = String(dto?.email || '')
        .trim()
        .toLowerCase();

      const msg = String(e?.message || '');
      const reason = /locked/i.test(msg) ? 'locked' : 'invalid_credentials';

      await this.audit.record(
        'auth.login.failure',
        null,
        null,
        { ip, ua },
        { email, reason },
      );

      this.logger.error('Login error:', e);
      throw e instanceof UnauthorizedException
        ? e
        : new UnauthorizedException('Invalid credentials');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('/me')
  async me(@Req() req: any) {
    try {
      return req.user || null;
    } catch (error) {
      this.logger.error('Error fetching user info:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/change-password')
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedException('Not authenticated');

      const currentPassword = String(dto?.currentPassword || '').trim();
      const newPassword = String(dto?.newPassword || '').trim();

      if (!currentPassword || !newPassword) {
        throw new BadRequestException(
          'Current password and new password are required',
        );
      }

      if (newPassword.length < 8) {
        throw new BadRequestException(
          'New password must be at least 8 characters',
        );
      }

      const result = await this.auth.changePassword(
        userId,
        currentPassword,
        newPassword,
      );

      const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || '');
      const ua = String(req?.headers?.['user-agent'] || '');
      await this.audit.record(
        'auth.password.changed',
        { userId, email: req.user?.email },
        null,
        { ip, ua },
        {},
      );

      return result;
    } catch (error) {
      this.logger.error('Error changing password:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('/change-email')
  async changeEmail(@Body() dto: ChangeEmailDto, @Req() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedException('Not authenticated');

      const newEmail = String(dto?.newEmail || '')
        .trim()
        .toLowerCase();
      const password = String(dto?.password || '').trim();

      if (!newEmail || !password) {
        throw new BadRequestException('New email and password are required');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        throw new BadRequestException('Invalid email format');
      }

      const result = await this.auth.requestEmailChange(
        userId,
        newEmail,
        password,
      );

      const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || '');
      const ua = String(req?.headers?.['user-agent'] || '');
      await this.audit.record(
        'auth.email.change_requested',
        { userId, email: req.user?.email },
        null,
        { ip, ua },
        { newEmail },
      );

      return result;
    } catch (error) {
      this.logger.error('Error changing email:', error);
      throw error;
    }
  }
}
