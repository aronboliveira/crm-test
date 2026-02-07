import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import TemplatesService from './templates.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('/project-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class TemplatesController {
  constructor(private readonly svc: TemplatesService) {}

  @Get()
  @Permissions('projects.read')
  async list() {
    const rows = await this.svc.list();
    return {
      items: rows.map((t) => ({
        id: String(t._id),
        key: t.key,
        name: t.name,
        description: t.description,
        category: t.category,
        tasks: t.tasks,
        defaultTags: t.defaultTags,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    };
  }

  @Get('/:key')
  @Permissions('projects.read')
  async findByKey(@Param('key') key: string) {
    const t = await this.svc.findByKey(key);
    return {
      id: String(t._id),
      key: t.key,
      name: t.name,
      description: t.description,
      category: t.category,
      tasks: t.tasks,
      defaultTags: t.defaultTags,
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
