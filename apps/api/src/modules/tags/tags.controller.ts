import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import TagsService from './tags.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('/tags')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class TagsController {
  constructor(private readonly svc: TagsService) {}

  @Get()
  @Permissions('projects.read')
  async list() {
    const rows = await this.svc.list();
    return {
      items: rows.map((t) => ({
        id: String(t._id),
        key: t.key,
        label: t.label,
        color: t.color,
        createdAt: t.createdAt,
      })),
    };
  }

  @Post()
  @Permissions('projects.manage')
  async create(@Body() dto: any) {
    const t = await this.svc.create(dto);
    return { id: String(t._id), key: t.key };
  }

  @Delete('/:id')
  @Permissions('projects.manage')
  async remove(@Param('id') id: string) {
    await this.svc.remove(id);
    return { ok: true };
  }
}
