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
import MilestonesService from './milestones.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('/milestones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class MilestonesController {
  constructor(private readonly svc: MilestonesService) {}

  @Get()
  @Permissions('projects.read')
  async list(@Query('projectId') projectId: string) {
    const rows = await this.svc.listByProject(projectId);
    return {
      items: rows.map((m) => ({
        id: String(m._id),
        projectId: m.projectId,
        title: m.title,
        description: m.description,
        dueAt: m.dueAt,
        completed: m.completed,
        completedAt: m.completedAt,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    };
  }

  @Post()
  @Permissions('projects.manage')
  async create(@Body() dto: any) {
    const m = await this.svc.create(dto);
    return { id: String(m._id), title: m.title };
  }

  @Patch('/:id')
  @Permissions('projects.manage')
  async update(@Param('id') id: string, @Body() dto: any) {
    const m = await this.svc.update(id, dto);
    return { id: String(m._id), title: m.title, completed: m.completed };
  }

  @Delete('/:id')
  @Permissions('projects.manage')
  async remove(@Param('id') id: string) {
    await this.svc.remove(id);
    return { ok: true };
  }
}
