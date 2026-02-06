import { Controller, Get, UseGuards, Req, Logger } from '@nestjs/common';
import UsersService from './users.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly s: UsersService) {
    try {
      if (!s) {
        this.logger.error('UsersService not injected');
        throw new Error('Service initialization failed');
      }
      this.logger.log('UsersController initialized');
    } catch (error) {
      this.logger.error('UsersController constructor error:', error);
      throw error;
    }
  }

  @Get()
  @Permissions('users.read')
  async list() {
    try {
      const rows = await this.s.list();
      return rows.map((u) => ({
        id: String(u._id),
        email: u.email,
        username: u.username,
        roles: u.roles,
        disabled: u.disabled,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));
    } catch (error) {
      this.logger.error('Error in list endpoint:', error);
      throw error;
    }
  }

  @Get('/me')
  async me(@Req() req: any) {
    try {
      if (!req.user) {
        this.logger.warn('No user found in request');
        return null;
      }
      return req.user;
    } catch (error) {
      this.logger.error('Error in me endpoint:', error);
      throw error;
    }
  }
}
