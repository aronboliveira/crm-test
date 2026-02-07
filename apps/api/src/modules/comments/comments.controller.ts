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
  Logger,
} from '@nestjs/common';
import CommentsService from './comments.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('/comments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class CommentsController {
  private readonly logger = new Logger(CommentsController.name);

  constructor(private readonly svc: CommentsService) {}

  @Get()
  @Permissions('tasks.read')
  async list(
    @Query('targetType') targetType: 'task' | 'project',
    @Query('targetId') targetId: string,
  ) {
    const rows = await this.svc.listByTarget(targetType, targetId);
    return {
      items: rows.map((c) => ({
        id: String(c._id),
        targetType: c.targetType,
        targetId: c.targetId,
        authorEmail: c.authorEmail,
        body: c.body,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };
  }

  @Post()
  @Permissions('tasks.write')
  async create(@Body() dto: any, @Req() req: any) {
    const c = await this.svc.create({
      targetType: dto.targetType,
      targetId: dto.targetId,
      authorEmail: req.user?.email || 'unknown',
      body: dto.body,
    });
    return { id: String(c._id) };
  }

  @Patch('/:id')
  @Permissions('tasks.write')
  async update(@Param('id') id: string, @Body() dto: any) {
    const c = await this.svc.update(id, dto.body);
    return { id: String(c._id) };
  }

  @Delete('/:id')
  @Permissions('tasks.manage')
  async remove(@Param('id') id: string) {
    await this.svc.remove(id);
    return { ok: true };
  }
}
