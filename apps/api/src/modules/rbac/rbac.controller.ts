import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from './permissions.guard';
import { Permissions } from './permissions.decorator';
import RbacCatalogService from './rbac.catalog.service';

@Controller('/rbac')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class RbacController {
  private readonly logger = new Logger(RbacController.name);

  constructor(private readonly cat: RbacCatalogService) {
    try {
      if (!cat) {
        this.logger.error('RbacCatalogService not injected');
        throw new Error('Service initialization failed');
      }
      this.logger.log('RbacController initialized');
    } catch (error) {
      this.logger.error('RbacController constructor error:', error);
      throw error;
    }
  }

  @Get('/roles')
  @Permissions('roles.read')
  async roles() {
    try {
      return await this.cat.roles();
    } catch (error) {
      this.logger.error('Error in roles endpoint:', error);
      throw error;
    }
  }

  @Get('/permissions')
  @Permissions('permissions.read')
  async permissions() {
    try {
      return await this.cat.permissions();
    } catch (error) {
      this.logger.error('Error in permissions endpoint:', error);
      throw error;
    }
  }
}
