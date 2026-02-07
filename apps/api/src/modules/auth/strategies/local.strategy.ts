import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import AuthService from '../auth.service';

@Injectable()
export default class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'email', passwordField: 'password' });
    try {
      if (!auth) {
        this.logger.error('AuthService not injected');
        throw new Error('Service initialization failed');
      }
      this.logger.log('LocalStrategy initialized');
    } catch (error) {
      this.logger.error('LocalStrategy constructor error:', error);
      throw error;
    }
  }

  async validate(email: string, password: string) {
    try {
      const u = await this.auth.validateUser(email, password);
      if (!u) {
        this.logger.warn(`Failed login attempt for email: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }
      return u;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Error validating local credentials:', error);
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
