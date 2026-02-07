import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Permissions } from '../../rbac/permissions.decorator';
import JwtAuthGuard from '../../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../../rbac/permissions.guard';
import MailAdminService from './mail-admin.service';

interface QueryParams {
  limit?: string;
  skip?: string;
  sort?: string;
}

@Controller('/admin/mail-outbox')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class MailAdminController {
  constructor(private readonly s: MailAdminService) {}

  @Get('/')
  @Permissions('users.manage')
  async list(@Query() q: QueryParams) {
    try {
      return await this.s.list(q);
    } catch (error) {
      throw error;
    }
  }

  @Get('/:id')
  @Permissions('users.manage')
  async read(@Param('id') id: string) {
    try {
      return await this.s.read(id);
    } catch (error) {
      throw error;
    }
  }
}
