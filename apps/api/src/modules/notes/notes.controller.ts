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
import NotesService from './notes.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('/notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class NotesController {
  constructor(private readonly svc: NotesService) {}

  @Get()
  @Permissions('tasks.read')
  async list(
    @Query('targetType') targetType: 'task' | 'project',
    @Query('targetId') targetId: string,
  ) {
    const rows = await this.svc.listByTarget(targetType, targetId);
    return {
      items: rows.map((n) => ({
        id: String(n._id),
        targetType: n.targetType,
        targetId: n.targetId,
        authorEmail: n.authorEmail,
        title: n.title,
        body: n.body,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    };
  }

  @Post()
  @Permissions('tasks.write')
  async create(@Body() dto: any, @Req() req: any) {
    const n = await this.svc.create({
      targetType: dto.targetType,
      targetId: dto.targetId,
      authorEmail: req.user?.email || 'unknown',
      title: dto.title,
      body: dto.body,
    });
    return { id: String(n._id) };
  }

  @Patch('/:id')
  @Permissions('tasks.write')
  async update(@Param('id') id: string, @Body() dto: any) {
    const n = await this.svc.update(id, dto);
    return { id: String(n._id) };
  }

  @Delete('/:id')
  @Permissions('tasks.manage')
  async remove(@Param('id') id: string) {
    await this.svc.remove(id);
    return { ok: true };
  }
}
