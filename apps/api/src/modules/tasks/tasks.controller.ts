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
  Logger,
} from '@nestjs/common';
import TasksService from './tasks.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('/tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(private readonly s: TasksService) {
    try {
      if (!s) {
        this.logger.error('TasksService not injected');
        throw new Error('Service initialization failed');
      }
      this.logger.log('TasksController initialized');
    } catch (error) {
      this.logger.error('TasksController constructor error:', error);
      throw error;
    }
  }

  @Get()
  @Permissions('tasks.read')
  async list(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    try {
      const rows = await this.s.list();
      const items = rows.map((t) => ({
        id: String(t._id),
        projectId: t.projectId,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assigneeEmail: (t as any).assigneeEmail || null,
        assigneeId: (t as any).assigneeId || null,
        milestoneId: (t as any).milestoneId || null,
        tags: (t as any).tags || [],
        subtasks: (t as any).subtasks || [],
        dueAt: t.dueAt,
        deadlineAt: (t as any).deadlineAt || null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
      return { items, nextCursor: null };
    } catch (error) {
      this.logger.error('Error in list endpoint:', error);
      throw error;
    }
  }

  @Post()
  @Permissions('tasks.write')
  async create(@Body() dto: any) {
    try {
      const t = await this.s.create(dto);
      this.logger.log(`Task created: ${String(t._id)}`);
      return { id: String(t._id) };
    } catch (error) {
      this.logger.error('Error in create endpoint:', error);
      throw error;
    }
  }

  @Patch('/:id')
  @Permissions('tasks.write')
  async update(@Param('id') id: string, @Body() dto: any) {
    try {
      const t = await this.s.update(id, dto);
      this.logger.log(`Task updated: ${id}`);
      return { id: String(t._id) };
    } catch (error) {
      this.logger.error('Error in update endpoint:', error);
      throw error;
    }
  }

  @Patch('/:id/subtasks')
  @Permissions('tasks.write')
  async updateSubtasks(
    @Param('id') id: string,
    @Body() dto: { subtasks: any[] },
  ) {
    try {
      const t = await this.s.updateSubtasks(id, dto.subtasks);
      this.logger.log(`Task subtasks updated: ${id}`);
      return { id: String(t._id), subtasks: t.subtasks || [] };
    } catch (error) {
      this.logger.error('Error in updateSubtasks endpoint:', error);
      throw error;
    }
  }

  @Delete('/:id')
  @Permissions('tasks.manage')
  async remove(@Param('id') id: string) {
    try {
      await this.s.remove(id);
      this.logger.log(`Task removed: ${id}`);
      return { ok: true };
    } catch (error) {
      this.logger.error('Error in remove endpoint:', error);
      throw error;
    }
  }
}
