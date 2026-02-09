import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('/admin/clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get('/')
  @Permissions('clients.read')
  async list(@Query('q') q?: string) {
    const items = await this.service.findAll(q);
    return {
      items,
      total: items.length,
      nextCursor: null,
    };
  }
}
