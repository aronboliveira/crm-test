import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { DevicesService } from './devices.service';

const resolveUserEmail = (request: any): string => {
  const rawEmail = request?.user?.email;
  if (typeof rawEmail === 'string' && rawEmail.trim()) {
    return rawEmail.trim().toLowerCase();
  }
  return 'unknown@corp.local';
};

@Controller('/devices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DevicesController {
  constructor(private readonly service: DevicesService) {}

  @Get()
  @Permissions('tasks.read')
  async list(
    @Req() req: any,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('kind') kind?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    return this.service.list(resolveUserEmail(req), {
      q,
      status,
      kind,
      page,
      pageSize,
      sortBy,
      sortDir,
    });
  }

  @Get('/analytics')
  @Permissions('tasks.read')
  async analytics(
    @Req() req: any,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('kind') kind?: string,
    @Query('days') days?: string,
    @Query('top') top?: string,
  ) {
    return this.service.analytics(resolveUserEmail(req), {
      q,
      status,
      kind,
      days,
      top,
    });
  }

  @Get('/:id')
  @Permissions('tasks.read')
  async getOne(@Req() req: any, @Param('id') id: string) {
    const item = await this.service.findOne(id, resolveUserEmail(req));
    return { item };
  }

  @Post()
  @Permissions('tasks.write')
  async create(@Req() req: any, @Body() dto: any) {
    const item = await this.service.create(resolveUserEmail(req), dto);
    return { id: String(item._id) };
  }

  @Patch('/:id')
  @Permissions('tasks.write')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    const item = await this.service.update(id, resolveUserEmail(req), dto);
    return { id: String(item._id) };
  }

  @Delete('/:id')
  @Permissions('tasks.write')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.service.remove(id, resolveUserEmail(req));
    return { ok: true };
  }
}
