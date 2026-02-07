import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import TaskEntity, {
  type TaskPriority,
  type TaskStatus,
} from '../../entities/TaskEntity';
import type { ProjectsLookupPort } from './ports/projects-lookup.port';
import { PROJECTS_LOOKUP_PORT } from './ports/projects-lookup.token';

type CreateTaskDto = Readonly<{
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string;
  assigneeId?: string;
  assigneeEmail?: string;
  milestoneId?: string;
  tags?: string[];
  deadlineAt?: string;
}>;

type UpdateTaskDto = Readonly<Partial<CreateTaskDto>>;

const isIso = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v);

@Injectable()
export default class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(PROJECTS_LOOKUP_PORT)
    private readonly projectsLookup: ProjectsLookupPort,
    @InjectRepository(TaskEntity)
    private readonly repo: MongoRepository<TaskEntity>,
  ) {
    try {
      if (!projectsLookup || !repo) {
        this.logger.error('One or more dependencies not injected');
        throw new Error('Service initialization failed');
      }
      this.logger.log('TasksService initialized');
    } catch (error) {
      this.logger.error('TasksService constructor error:', error);
      throw error;
    }
  }

  async list(): Promise<readonly TaskEntity[]> {
    try {
      const tasks = await this.repo.find({ take: 1000 } as any);
      this.logger.log(`Retrieved ${tasks.length} tasks`);
      return tasks;
    } catch (error) {
      this.logger.error('Error listing tasks:', error);
      throw error;
    }
  }

  async create(dto: CreateTaskDto): Promise<TaskEntity> {
    try {
      const projectId =
        typeof dto?.projectId === 'string' ? dto.projectId.trim() : '';
      const title = typeof dto?.title === 'string' ? dto.title.trim() : '';
      if (!projectId) {
        this.logger.warn('Create task - invalid projectId');
        throw new BadRequestException('Invalid projectId');
      }
      if (!title) {
        this.logger.warn('Create task - invalid title');
        throw new BadRequestException('Invalid title');
      }

      const projectOk = await this.projectsLookup.existsById(projectId);
      if (!projectOk) {
        this.logger.warn(`Create task - project not found: ${projectId}`);
        throw new BadRequestException('Invalid projectId (project not found)');
      }

      const status: TaskStatus =
        dto.status === 'doing' ||
        dto.status === 'done' ||
        dto.status === 'blocked'
          ? dto.status
          : 'todo';

      const pr =
        typeof dto.priority === 'number' ? dto.priority : Number(dto.priority);
      const priority: TaskPriority =
        pr === 1 || pr === 2 || pr === 3 || pr === 4 || pr === 5
          ? (pr as TaskPriority)
          : 3;

      const now = new Date().toISOString();

      const task = await this.repo.save({
        projectId,
        title,
        description:
          typeof dto.description === 'string' && dto.description.trim()
            ? dto.description.trim()
            : undefined,
        status,
        priority,
        assigneeEmail:
          typeof dto.assigneeEmail === 'string' && dto.assigneeEmail.trim()
            ? dto.assigneeEmail.trim()
            : undefined,
        assigneeId:
          typeof dto.assigneeId === 'string' && dto.assigneeId.trim()
            ? dto.assigneeId.trim()
            : undefined,
        milestoneId:
          typeof dto.milestoneId === 'string' && dto.milestoneId.trim()
            ? dto.milestoneId.trim()
            : undefined,
        tags: Array.isArray(dto.tags) ? dto.tags.filter(Boolean) : undefined,
        dueAt: isIso(dto.dueAt) ? dto.dueAt : undefined,
        deadlineAt: isIso(dto.deadlineAt) ? dto.deadlineAt : undefined,
        createdAt: now,
        updatedAt: now,
      } as any);

      this.logger.log(`Task created: ${task._id}`);
      return task;
    } catch (error) {
      this.logger.error('Error creating task:', error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateTaskDto): Promise<TaskEntity> {
    try {
      const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
      if (!oid) {
        this.logger.warn(`Update task - invalid id: ${id}`);
        throw new BadRequestException('Invalid id');
      }

      const cur = await this.repo.findOne({ where: { _id: oid } as any });
      if (!cur) {
        this.logger.warn(`Update task - not found: ${id}`);
        throw new NotFoundException('Not found');
      }

      const patch: any = {};
      const title = typeof dto.title === 'string' ? dto.title.trim() : '';
      if (title) {
        patch.title = title;
      }

      if (typeof dto.description === 'string') {
        patch.description = dto.description.trim()
          ? dto.description.trim()
          : undefined;
      }

      if (
        dto.status === 'todo' ||
        dto.status === 'doing' ||
        dto.status === 'done' ||
        dto.status === 'blocked'
      ) {
        patch.status = dto.status;
      }

      const pr =
        typeof dto.priority === 'number' ? dto.priority : Number(dto.priority);
      if (pr === 1 || pr === 2 || pr === 3 || pr === 4 || pr === 5) {
        patch.priority = pr;
      }

      if (isIso(dto.dueAt)) {
        patch.dueAt = dto.dueAt;
      }

      if (isIso(dto.deadlineAt)) {
        patch.deadlineAt = dto.deadlineAt;
      }

      if (typeof dto.assigneeId === 'string') {
        patch.assigneeId = dto.assigneeId.trim() || undefined;
      }

      if (typeof dto.assigneeEmail === 'string') {
        patch.assigneeEmail = dto.assigneeEmail.trim() || undefined;
      }

      if (typeof dto.milestoneId === 'string') {
        patch.milestoneId = dto.milestoneId.trim() || undefined;
      }

      if (Array.isArray(dto.tags)) {
        patch.tags = dto.tags.filter(Boolean);
      }

      if (typeof dto.projectId === 'string') {
        const nextPid = dto.projectId.trim();
        if (!nextPid) {
          this.logger.warn('Update task - invalid projectId');
          throw new BadRequestException('Invalid projectId');
        }

        const ok = await this.projectsLookup.existsById(nextPid);
        if (!ok) {
          this.logger.warn(`Update task - project not found: ${nextPid}`);
          throw new BadRequestException(
            'Invalid projectId (project not found)',
          );
        }

        patch.projectId = nextPid;
      }

      patch.updatedAt = new Date().toISOString();

      await this.repo.update(oid as any, patch);
      const updated = await this.repo.findOne({ where: { _id: oid } as any });
      this.logger.log(`Task updated: ${id}`);
      return updated as any;
    } catch (error) {
      this.logger.error('Error updating task:', error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
      if (!oid) {
        this.logger.warn(`Remove task - invalid id: ${id}`);
        throw new BadRequestException('Invalid id');
      }

      await this.repo.delete(oid as any);
      this.logger.log(`Task removed: ${id}`);
    } catch (error) {
      this.logger.error('Error removing task:', error);
      throw error;
    }
  }
}
