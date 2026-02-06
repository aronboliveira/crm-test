import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  UnauthorizedException,
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
}
