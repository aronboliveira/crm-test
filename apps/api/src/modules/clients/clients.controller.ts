import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get()
  @Permissions('clients.read')
  async list(@Query('q') q?: string) {
    const items = await this.service.findAll(q);
    return {
      items,
      total: items.length,
      nextCursor: null,
    };
  }

  @Post()
  @Permissions('clients.write')
  async create(@Body() dto: any) {
    const item = await this.service.create(dto);
    return { id: String(item._id) };
  }

  @Patch('/:id')
  @Permissions('clients.write')
  async update(@Param('id') id: string, @Body() dto: any) {
    const item = await this.service.update(id, dto);
    return { id: String(item._id) };
  }

  @Delete('/:id')
  @Permissions('clients.manage')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { ok: true };
  }
}
