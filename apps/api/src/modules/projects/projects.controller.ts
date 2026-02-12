import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
  Logger,
} from '@nestjs/common';
import ProjectsService from './projects.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('/projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(private readonly s: ProjectsService) {
    try {
      if (!s) {
        this.logger.error('ProjectsService not injected');
        throw new Error('Service initialization failed');
      }
      this.logger.log('ProjectsController initialized');
    } catch (error) {
      this.logger.error('ProjectsController constructor error:', error);
      throw error;
    }
  }

  @Get()
  @Permissions('projects.read')
  async list(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    try {
      const rows = await this.s.list();
      const items = rows.map((p) => ({
        id: String(p._id),
        code: (p as any).code || null,
        name: p.name,
        description: p.description,
        status: p.status,
        clientId: (p as any).clientId || null,
        ownerEmail: (p as any).ownerEmail || null,
        dueAt: (p as any).dueAt || null,
        deadlineAt: (p as any).deadlineAt || null,
        tags: (p as any).tags || [],
        templateKey: (p as any).templateKey || null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
      return { items, nextCursor: null };
    } catch (error) {
      this.logger.error('Error in list endpoint:', error);
      throw error;
    }
  }

  @Post()
  @Permissions('projects.write')
  async create(@Body() dto: any) {
    try {
      const p = await this.s.create(dto);
      this.logger.log(`Project created: ${String(p._id)}`);
      return { id: String(p._id) };
    } catch (error) {
      this.logger.error('Error in create endpoint:', error);
      throw error;
    }
  }

  @Patch('/:id')
  @Permissions('projects.write')
  async update(@Param('id') id: string, @Body() dto: any) {
    try {
      const p = await this.s.update(id, dto);
      this.logger.log(`Project updated: ${id}`);
      return { id: String(p._id) };
    } catch (error) {
      this.logger.error('Error in update endpoint:', error);
      throw error;
    }
  }

  @Delete('/:id')
  @Permissions('projects.manage')
  async remove(@Param('id') id: string) {
    try {
      await this.s.remove(id);
      this.logger.log(`Project removed: ${id}`);
      return { ok: true };
    } catch (error) {
      this.logger.error('Error in remove endpoint:', error);
      throw error;
    }
  }

  @Get('/options')
  @Permissions('projects.read')
  async options(@Query('activeOnly') activeOnly?: string) {
    try {
      const only = String(activeOnly ?? '1') === '1';
      return await this.s.options(only);
    } catch (error) {
      this.logger.error('Error in options endpoint:', error);
      throw error;
    }
  }
}
