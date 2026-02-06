import { Controller, Get, Query } from '@nestjs/common';
import { Permissions } from '../../rbac/permissions.decorator';
import AuditAdminService from './audit-admin.service';

interface QueryParams {
  limit?: string;
  skip?: string;
  sort?: string;
  startDate?: string;
  endDate?: string;
}

@Controller('/admin/audit')
export default class AuditAdminController {
  constructor(private readonly s: AuditAdminService) {}

  @Get('/')
  @Permissions('audit.read')
  async list(@Query() q: QueryParams) {
    try {
      return await this.s.list(q);
    } catch (error) {
      throw error;
    }
  }
}
